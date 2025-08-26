"use client"

import React, { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { createEpic, updateEpic } from "@/lib/epic-service"
import type { Epic } from "@/types/epic"
import { EPIC_COLORS, EPIC_ICONS } from "@/types/epic"
import { Button } from "@/components/ui/button"
import { 
  X,
  Check,
  Loader2,
  Plus,
  Trash2,
  Rocket,
  Zap,
  Target,
  Wrench,
  Lightbulb,
  Shield,
  BarChart3,
  Palette,
  Search,
  Settings,
  Smartphone,
  Star,
  Building2,
  Lock,
  FileText
} from "lucide-react"

// Icon component map for rendering
const IconMap = {
  Rocket,
  Zap,
  Target,
  Wrench,
  Lightbulb,
  Shield,
  BarChart3,
  Palette,
  Search,
  Settings,
  Smartphone,
  Star,
  Building2,
  Lock,
  FileText
}

// Helper function to render icon
const renderIcon = (iconName: string, className: string = "h-4 w-4") => {
  const IconComponent = IconMap[iconName as keyof typeof IconMap]
  return IconComponent ? <IconComponent className={className} /> : <FileText className={className} />
}

interface CreateEpicModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  editingEpic?: Epic | null
}

export function CreateEpicModal({ 
  open, 
  onOpenChange, 
  projectId,
  editingEpic = null
}: CreateEpicModalProps) {
  const { user } = useAuth()
  
  // Form refs for uncontrolled inputs
  const formRefs = useRef({
    name: null as HTMLInputElement | null,
    description: null as HTMLTextAreaElement | null,
    targetDate: null as HTMLInputElement | null,
  })
  
  // Acceptance criteria state (controlled)
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([
    'All child stories are completed',
    'Performance and scalability requirements are met',
    'Documentation and training materials are complete'
  ])
  
  // Controlled state for selects
  const [selectedColor, setSelectedColor] = useState(EPIC_COLORS[0].value)
  const [selectedIcon, setSelectedIcon] = useState(EPIC_ICONS[0])
  // Status handling: new epics start as 'planning', editing preserves existing status
  const [selectedStatus, setSelectedStatus] = useState<Epic['status']>('planning')
  const [creating, setCreating] = useState(false)
  
  const isEditing = !!editingEpic

  // Populate form when editing
  useEffect(() => {
    if (open && editingEpic) {
      // Use setTimeout to ensure refs are available after render
      setTimeout(() => {
        if (formRefs.current.name) formRefs.current.name.value = editingEpic.name
        if (formRefs.current.description) formRefs.current.description.value = editingEpic.description
        if (formRefs.current.targetDate && editingEpic.targetDate) {
          formRefs.current.targetDate.value = new Date(editingEpic.targetDate).toISOString().split('T')[0]
        }
      }, 0)
      
      setSelectedColor(editingEpic.color)
      setSelectedIcon(editingEpic.icon || EPIC_ICONS[0])
      setSelectedStatus(editingEpic.status)
      setAcceptanceCriteria(editingEpic.acceptanceCriteria?.length ? editingEpic.acceptanceCriteria : [
        'All child stories are completed',
        'Performance and scalability requirements are met',
        'Documentation and training materials are complete'
      ])
    } else if (open && !editingEpic) {
      // Reset form for new epic
      setTimeout(() => {
        if (formRefs.current.name) formRefs.current.name.value = ""
        if (formRefs.current.description) formRefs.current.description.value = ""
        if (formRefs.current.targetDate) formRefs.current.targetDate.value = ""
      }, 0)
      
      setSelectedColor(EPIC_COLORS[0].value)
      setSelectedIcon(EPIC_ICONS[0])
      setSelectedStatus('planning')
      setAcceptanceCriteria([
        'All child stories are completed',
        'Performance and scalability requirements are met',
        'Documentation and training materials are complete'
      ])
    }
  }, [open, editingEpic])

  // Acceptance criteria helpers
  const addAcceptanceCriteria = () => {
    setAcceptanceCriteria([...acceptanceCriteria, ''])
  }

  const removeAcceptanceCriteria = (index: number) => {
    if (acceptanceCriteria.length > 1) {
      setAcceptanceCriteria(acceptanceCriteria.filter((_, i) => i !== index))
    }
  }

  const updateAcceptanceCriteria = (index: number, value: string) => {
    const newCriteria = [...acceptanceCriteria]
    newCriteria[index] = value
    setAcceptanceCriteria(newCriteria)
  }

  const handleSubmit = async () => {
    if (!user) return
    
    const name = formRefs.current.name?.value.trim()
    if (!name) return
    
    setCreating(true)
    try {
      const epicData = {
        name,
        description: formRefs.current.description?.value.trim() || "",
        acceptanceCriteria: acceptanceCriteria.filter(criteria => criteria.trim() !== ''),
        projectId,
        color: selectedColor,
        icon: selectedIcon,
        status: isEditing ? selectedStatus : ('planning' as const),
        targetDate: formRefs.current.targetDate?.value 
          ? new Date(formRefs.current.targetDate.value) 
          : undefined,
        ownerId: user.uid
      }
      
      if (isEditing && editingEpic) {
        // Update existing epic
        await updateEpic(editingEpic.id, {
          name: epicData.name,
          description: epicData.description,
          acceptanceCriteria: epicData.acceptanceCriteria,
          color: epicData.color,
          icon: epicData.icon,
          status: epicData.status,
          targetDate: epicData.targetDate
        })
      } else {
        // Create new epic
        await createEpic(epicData)
      }
      
      onOpenChange(false)
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} epic:`, error)
    } finally {
      setCreating(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={() => onOpenChange(false)}
      />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-muted">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {isEditing ? "Edit Epic" : "Create Epic"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isEditing 
                  ? `Editing: ${editingEpic?.name}`
                  : "Organize your stories into manageable epics"
                }
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-[60vh] overflow-y-auto p-6">
            <div className="max-w-xl mx-auto space-y-6">
              {/* Basic Information */}
              <div className="space-y-4 p-6 bg-muted/30 border border-border rounded-lg">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1">
                      Epic Name *
                    </label>
                    <input
                      ref={(el) => { if (formRefs.current) formRefs.current.name = el }}
                      id="name"
                      type="text"
                      placeholder="e.g., User Authentication"
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium mb-1">
                      Description
                    </label>
                    <textarea
                      ref={(el) => { if (formRefs.current) formRefs.current.description = el }}
                      id="description"
                      placeholder="Describe what this epic encompasses..."
                      rows={3}
                      className="mt-1 resize-none flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Acceptance Criteria */}
              <div className="space-y-4 p-6 bg-muted/30 border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Acceptance Criteria</h3>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    onClick={addAcceptanceCriteria}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Criteria
                  </Button>
                </div>
                <div className="space-y-3">
                  {acceptanceCriteria.map((criteria, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1">
                        <textarea
                          value={criteria}
                          onChange={(e) => updateAcceptanceCriteria(index, e.target.value)}
                          placeholder={`Acceptance criteria ${index + 1}...`}
                          rows={2}
                          className="resize-none flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                      {acceptanceCriteria.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => removeAcceptanceCriteria(index)}
                          className="px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {acceptanceCriteria.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No acceptance criteria defined. Click &quot;Add Criteria&quot; to add requirements.
                    </p>
                  )}
                </div>
              </div>

              {/* Visual & Status */}
              <div className="space-y-4 p-6 bg-muted/30 border border-border rounded-lg">
                <h3 className="text-lg font-medium">Visual & Status</h3>
                
                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {EPIC_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setSelectedColor(color.value)}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          selectedColor === color.value 
                            ? 'border-gray-900 dark:border-white scale-110' 
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Icon Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {EPIC_ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setSelectedIcon(icon)}
                        className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg transition-all ${
                          selectedIcon === icon 
                            ? 'border-primary bg-primary/10' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                        }`}
                      >
                        {renderIcon(icon, "h-5 w-5")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status - Only show for editing */}
                {isEditing && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['planning', 'active', 'completed'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => setSelectedStatus(status)}
                          className={`px-3 py-2 rounded-md border capitalize transition-all ${
                            selectedStatus === status
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Planning */}
              <div className="space-y-4 p-6 bg-muted/30 border border-border rounded-lg">
                <h3 className="text-lg font-medium">Planning</h3>
                <div>
                  <label htmlFor="targetDate" className="block text-sm font-medium mb-1">
                    Target Date
                  </label>
                  <input
                    ref={(el) => { if (formRefs.current) formRefs.current.targetDate = el }}
                    id="targetDate"
                    type="date"
                    className="mt-1 flex h-10 w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-4 p-6 bg-muted/30 border border-border rounded-lg">
                <h3 className="text-lg font-medium mb-3">Preview</h3>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: selectedColor + '20', color: selectedColor }}
                  >
                    {renderIcon(selectedIcon, "h-6 w-6")}
                  </div>
                  <div>
                    <div className="font-medium">
                      {formRefs.current?.name?.value || "Epic Name"}
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {isEditing ? selectedStatus : 'planning'} Epic
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Fields marked with * are required
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {isEditing ? "Update Epic" : "Create Epic"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}