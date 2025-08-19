"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { createStory, updateStory, getStoryTemplates } from "@/lib/story-service"
import { getEpicsByProject } from "@/lib/epic-service"
import type { StoryTemplate, Story } from "@/types/story"
import type { Epic } from "@/types/epic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

import {
  Plus,
  Search,
  FileText,
  Bug,
  Zap,
  Target,
  FlaskConical,
  Loader2,
  X,
  Check,
  ArrowLeft,
  Rocket,
  Wrench,
  Lightbulb,
  Shield,
  BarChart3,
  Palette,
  Settings,
  Smartphone,
  Star,
  Building2,
  Lock
} from "lucide-react"

// Icon component map for rendering epic icons
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
const renderEpicIcon = (iconName: string, className: string = "h-4 w-4") => {
  const IconComponent = IconMap[iconName as keyof typeof IconMap]
  return IconComponent ? <IconComponent className={className} /> : <FileText className={className} />
}

interface CreateStoryModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onStoryCreated: (storyData?: any) => void
  editingStory?: Story | null
  defaultEpicId?: string
  sessionMode?: boolean // New prop to indicate session story creation
}

export default function CreateStoryModal({ 
  isOpen, 
  onClose, 
  projectId, 
  onStoryCreated,
  editingStory = null,
  defaultEpicId,
  sessionMode = false
}: CreateStoryModalProps) {
  const [lockedProjectId, setLockedProjectId] = useState<string>('')
  const { user } = useAuth()
  
  // Template state
  const [templates, setTemplates] = useState<StoryTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<StoryTemplate | null>(null)
  const [templateSearch, setTemplateSearch] = useState("")
  const [templateCategory, setTemplateCategory] = useState<string>("all")
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  
  // Epic state
  const [epics, setEpics] = useState<Epic[]>([])
  const [selectedEpicId, setSelectedEpicId] = useState<string>("no-epic")
  const [loadingEpics, setLoadingEpics] = useState(false)
  
  // Form refs for uncontrolled inputs
  const formRefs = useRef({
    title: null as HTMLInputElement | null,
    description: null as HTMLTextAreaElement | null,
    asA: null as HTMLInputElement | null,
    iWant: null as HTMLInputElement | null,
    soThat: null as HTMLInputElement | null,
    timeEstimate: null as HTMLInputElement | null,
  })
  
  // Controlled selects
  const [selectData, setSelectData] = useState({
    type: "story" as "story" | "task" | "bug" | "spike",
    businessValue: 5,
    priority: "Should Have" as "Must Have" | "Should Have" | "Could Have" | "Won't Have",
    riskLevel: "Medium" as "Low" | "Medium" | "High" | "Critical",
    complexity: "Moderate" as "Simple" | "Moderate" | "Complex" | "Epic",
    storyPoints: undefined as number | undefined,
    estimationConfidence: "Medium" as "Low" | "Medium" | "High"
  })
  
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([])
  const [labels, setLabels] = useState<string[]>([])
  const [newCriterionInput, setNewCriterionInput] = useState("")
  const [newLabelInput, setNewLabelInput] = useState("")
  const [showCriterionInput, setShowCriterionInput] = useState(false)
  const [showLabelInput, setShowLabelInput] = useState(false)
  
  const [creating, setCreating] = useState(false)
  const [currentStep, setCurrentStep] = useState<"template" | "form">("template")
  
  const isEditing = !!editingStory

  // No-op handler to prevent React warnings - we use uncontrolled inputs
  const handleInputChange = useCallback(() => {
    // Intentionally empty - using uncontrolled inputs for performance
  }, [])

  // Lock projectId when modal opens and load templates
  useEffect(() => {
    if (isOpen && projectId) {
      setLockedProjectId(projectId)
      
      // Set the selected epic immediately if defaultEpicId is provided
      if (!isEditing && defaultEpicId) {
        setSelectedEpicId(defaultEpicId)
      } else {
        setSelectedEpicId("no-epic")
      }
      
      // Load epics for project
      loadEpics()
      if (!isEditing) {
        loadTemplates()
      } else {
        // Skip template selection for editing, go straight to form
        setCurrentStep("form")
        populateFormForEditing()
      }
    } else if (!isOpen) {
      setLockedProjectId('')
      // Reset state when modal closes
      setCurrentStep("template")
      setSelectedTemplate(null)
      setSelectedEpicId("no-epic")
      setEpics([])
    }
  }, [isOpen, projectId, isEditing, defaultEpicId])

  const loadTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const projectIdToUse = lockedProjectId || projectId
      const projectTemplates = await getStoryTemplates(projectIdToUse)
      setTemplates(projectTemplates)
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const loadEpics = async () => {
    setLoadingEpics(true)
    try {
      const projectIdToUse = lockedProjectId || projectId
      const projectEpics = await getEpicsByProject(projectIdToUse)
      setEpics(projectEpics)
    } catch (error) {
      console.error('Error loading epics:', error)
    } finally {
      setLoadingEpics(false)
    }
  }

  // Filter templates - exclude epic templates since we have dedicated epic management
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      // Exclude epic templates entirely
      if (template.category === 'epic') return false
      
      const matchesSearch = !templateSearch || 
        template.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
        template.description.toLowerCase().includes(templateSearch.toLowerCase())
      
      const matchesCategory = templateCategory === "all" || template.category === templateCategory
      
      return matchesSearch && matchesCategory
    })
  }, [templates, templateSearch, templateCategory])

  const handleTemplateSelect = useCallback((template: StoryTemplate) => {
    setSelectedTemplate(template)
    
    // Update refs after moving to form step (refs need to exist first)
    setCurrentStep("form")
    
    // Use setTimeout to ensure refs are available after render
    setTimeout(() => {
      if (formRefs.current.title) formRefs.current.title.value = template.name
      if (formRefs.current.description) formRefs.current.description.value = template.description
      if (formRefs.current.asA) formRefs.current.asA.value = template.asA
      if (formRefs.current.iWant) formRefs.current.iWant.value = template.iWant
      if (formRefs.current.soThat) formRefs.current.soThat.value = template.soThat
      if (formRefs.current.timeEstimate) formRefs.current.timeEstimate.value = template.defaultTimeEstimate || ""
    }, 0)
    
    // Update selects (epic templates are excluded, so always set type to 'story')
    setSelectData(prev => ({
      ...prev,
      type: 'story',
      businessValue: template.defaultBusinessValue,
      priority: template.defaultPriority,
      riskLevel: template.riskLevel,
      complexity: template.complexity,
      storyPoints: template.suggestedStoryPoints?.[0]
    }))
    
    setAcceptanceCriteria(template.defaultAcceptanceCriteria)
    setLabels(template.suggestedLabels)
  }, [])

  const handleStartFromScratch = useCallback(() => {
    setSelectedTemplate(null)
    setCurrentStep("form")
  }, [])

  // Populate form with existing story data for editing
  const populateFormForEditing = useCallback(() => {
    if (!editingStory) return

    // Use setTimeout to ensure refs are available after render
    setTimeout(() => {
      if (formRefs.current.title) formRefs.current.title.value = editingStory.title
      if (formRefs.current.description) formRefs.current.description.value = editingStory.description
      if (formRefs.current.asA) formRefs.current.asA.value = editingStory.asA || ""
      if (formRefs.current.iWant) formRefs.current.iWant.value = editingStory.iWant || ""
      if (formRefs.current.soThat) formRefs.current.soThat.value = editingStory.soThat || ""
      if (formRefs.current.timeEstimate) formRefs.current.timeEstimate.value = editingStory.timeEstimate || ""
    }, 0)

    // Populate select data
    setSelectedEpicId(editingStory.epicId || "no-epic")
    setSelectData({
      type: editingStory.type,
      businessValue: editingStory.businessValue,
      priority: editingStory.priority,
      riskLevel: editingStory.riskLevel,
      complexity: editingStory.complexity,
      storyPoints: editingStory.storyPoints,
      estimationConfidence: editingStory.estimationConfidence
    })

    // Populate acceptance criteria and labels
    setAcceptanceCriteria(editingStory.acceptanceCriteria.map(ac => ac.description))
    setLabels(editingStory.labels)
  }, [editingStory])

  // Acceptance criteria handlers
  const handleAddAcceptanceCriterion = useCallback(() => {
    setShowCriterionInput(true)
  }, [])

  const handleSaveCriterion = useCallback(() => {
    if (newCriterionInput.trim()) {
      setAcceptanceCriteria(prev => [...prev, newCriterionInput.trim()])
      setNewCriterionInput("")
    }
    setShowCriterionInput(false)
  }, [newCriterionInput])

  const handleCancelCriterion = useCallback(() => {
    setNewCriterionInput("")
    setShowCriterionInput(false)
  }, [])

  const handleRemoveAcceptanceCriterion = useCallback((index: number) => {
    setAcceptanceCriteria(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Label handlers
  const handleAddLabel = useCallback(() => {
    setShowLabelInput(true)
  }, [])

  const handleSaveLabel = useCallback(() => {
    if (newLabelInput.trim()) {
      setLabels(prev => [...prev, newLabelInput.trim()])
      setNewLabelInput("")
    }
    setShowLabelInput(false)
  }, [newLabelInput])

  const handleCancelLabel = useCallback(() => {
    setNewLabelInput("")
    setShowLabelInput(false)
  }, [])

  const handleRemoveLabel = useCallback((label: string) => {
    setLabels(prev => prev.filter(l => l !== label))
  }, [])

  const handleCreateStory = async () => {
    if (!user) return

    const projectIdToUse = lockedProjectId || projectId
    if (!projectIdToUse) return

    setCreating(true)
    try {
      if (isEditing && editingStory) {
        // Update existing story
        await updateStory(editingStory.id, {
          title: formRefs.current.title?.value || "",
          description: formRefs.current.description?.value || "",
          type: selectData.type,
          asA: formRefs.current.asA?.value || "",
          iWant: formRefs.current.iWant?.value || "",
          soThat: formRefs.current.soThat?.value || "",
          businessValue: selectData.businessValue,
          priority: selectData.priority,
          riskLevel: selectData.riskLevel,
          complexity: selectData.complexity,
          acceptanceCriteria: acceptanceCriteria.map((criteria, index) => ({
            id: `ac_${index}`,
            description: criteria,
            type: "checklist" as const,
            isCompleted: false,
            testable: true,
            priority: "must" as const
          })),
          storyPoints: selectData.storyPoints,
          timeEstimate: formRefs.current.timeEstimate?.value || "",
          estimationConfidence: selectData.estimationConfidence,
          epicId: selectedEpicId && selectedEpicId !== "no-epic" ? selectedEpicId : undefined,
          labels: labels
        })
      } else {
        // Create new story
        await createStory({
          title: formRefs.current.title?.value || "",
          description: formRefs.current.description?.value || "",
          type: selectData.type,
          asA: formRefs.current.asA?.value || "",
          iWant: formRefs.current.iWant?.value || "",
          soThat: formRefs.current.soThat?.value || "",
          businessValue: selectData.businessValue,
          priority: selectData.priority,
          riskLevel: selectData.riskLevel,
          complexity: selectData.complexity,
          acceptanceCriteria: acceptanceCriteria.map((criteria, index) => ({
            id: `ac_${index}`,
            description: criteria,
            type: "checklist" as const,
            isCompleted: false,
            testable: true,
            priority: "must" as const
          })),
          definitionOfDone: [],
          functionalRequirements: [],
          nonFunctionalRequirements: [],
          businessRules: [],
          storyPoints: selectData.storyPoints,
          timeEstimate: formRefs.current.timeEstimate?.value || "",
          estimationConfidence: selectData.estimationConfidence,
          childStoryIds: [],
          dependencyIds: [],
          blockedByIds: [],
          relatedStoryIds: [],
          status: sessionMode ? "ready" : "backlog",
          blockers: [],
          reportedBy: user.uid,
          stakeholders: [],
          labels: labels,
          components: [],
          testScenarios: [],
          attachments: [],
          mockups: [],
          wireframes: [],
          specifications: [],
          comments: [],
          reopenedCount: 0,
          projectId: projectIdToUse,
          epicId: selectedEpicId && selectedEpicId !== "no-epic" ? selectedEpicId : undefined,
          createdFromTemplate: selectedTemplate?.id
        })
      }
      
      onStoryCreated()
      onClose()
      
      // Reset form
      setCurrentStep("template")
      setSelectedTemplate(null)
      setTemplateSearch("")
      setTemplateCategory("all")
      // Clear form refs
      Object.values(formRefs.current).forEach(ref => {
        if (ref) ref.value = ""
      })
      setAcceptanceCriteria([])
      setLabels([])
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} story:`, error)
    } finally {
      setCreating(false)
    }
  }

  const handleClose = useCallback(() => {
    setCurrentStep("template")
    setSelectedTemplate(null)
    setTemplateSearch("")
    setTemplateCategory("all")
    // Clear form refs
    Object.values(formRefs.current).forEach(ref => {
      if (ref) ref.value = ""
    })
    setAcceptanceCriteria([])
    setLabels([])
    onClose()
  }, [onClose])

  const getTypeIcon = useCallback((type: string) => {
    const icons = {
      "story": FileText,
      "epic": Target,
      "task": Zap,
      "bug": Bug,
      "spike": FlaskConical,
      "feature": FileText,
      "technical": Zap,
      "research": FlaskConical
    }
    const Icon = icons[type as keyof typeof icons] || FileText
    return <Icon className="h-4 w-4" />
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isEditing 
                  ? "Edit Story" 
                  : currentStep === "template" 
                    ? "Choose Template" 
                    : "Create Story"
                }
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {isEditing
                  ? `Editing: ${editingStory?.title}`
                  : sessionMode
                    ? "Creating a story for the planning session"
                    : currentStep === "template" 
                      ? "Select a template or start from scratch"
                      : selectedTemplate ? `Using: ${selectedTemplate.name}` : "Custom story"
                }
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentStep === "template" && !isEditing && (
            <div className="h-full flex flex-col">
              {/* Search & Filters */}
              <div className="p-6 border-b bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search templates..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={templateCategory} onValueChange={setTemplateCategory}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="mt-4 flex flex-col sm:flex-row gap-4 items-start">
                  {/* Epic Assignment Display */}
                  <div className="w-full sm:flex-1">
                    <Label className="text-sm font-medium">Epic for this Story</Label>
                    <div className="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-input">
                      {loadingEpics ? (
                        <span className="text-sm text-muted-foreground">Loading epics...</span>
                      ) : selectedEpicId === "no-epic" ? (
                        <span className="text-sm text-muted-foreground">No Epic - Story will be unassigned</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          {(() => {
                            const selectedEpic = epics.find(epic => epic.id === selectedEpicId)
                            if (!selectedEpic) {
                              return <span className="text-sm text-muted-foreground">No Epic - Story will be unassigned</span>
                            }
                            return (
                              <>
                                <div 
                                  className="w-4 h-4 rounded-sm flex items-center justify-center"
                                  style={{ backgroundColor: selectedEpic.color + '20', color: selectedEpic.color }}
                                >
                                  {selectedEpic.icon ? renderEpicIcon(selectedEpic.icon, "h-3 w-3") : <FileText className="h-3 w-3" />}
                                </div>
                                <span className="text-sm font-medium">{selectedEpic.name}</span>
                                <span className="text-xs text-muted-foreground ml-auto">Auto-assigned</span>
                              </>
                            )
                          })()} 
                        </div>
                      )}
                    </div>
                    {!loadingEpics && selectedEpicId !== "no-epic" && epics.find(epic => epic.id === selectedEpicId) && (
                      <p className="text-xs text-muted-foreground mt-1">Story will be automatically assigned to this epic</p>
                    )}
                  </div>
                  
                  <div className="w-full sm:w-auto mt-4 sm:mt-6">
                    <Button 
                      onClick={handleStartFromScratch} 
                      variant="outline" 
                      className="w-full sm:w-auto"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Start from Scratch
                    </Button>
                  </div>
                </div>
              </div>

              {/* Template Grid */}
              <ScrollArea className="h-[60vh] p-6">
                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredTemplates.map((template) => (
                      <Card 
                        key={template.id} 
                        className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-blue-300"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                {getTypeIcon(template.category)}
                              </div>
                              <div>
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                {template.isDefault && (
                                  <Badge variant="secondary" className="text-xs mt-1">Popular</Badge>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs capitalize">
                              {template.category}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-sm mb-3">
                            {template.description}
                          </CardDescription>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {template.suggestedLabels.slice(0, 3).map((label) => (
                              <Badge key={label} variant="outline" className="text-xs">
                                {label}
                              </Badge>
                            ))}
                            {template.suggestedLabels.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.suggestedLabels.length - 3}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                            As a <strong>{template.asA}</strong>, I want {template.iWant}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {(currentStep === "form" || isEditing) && (
            <div className="h-full flex flex-col">
              {/* Back Navigation - only show for creating, not editing */}
              {!isEditing && (
                <div className="px-6 py-3 border-b bg-gray-50/50 dark:bg-gray-800/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep("template")}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Templates
                  </Button>
                </div>
              )}

              <ScrollArea className="h-[60vh] p-6">
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* Basic Info */}
                  <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <h3 className="text-lg font-medium">Basic Information</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="lg:col-span-2">
                        <Label htmlFor="title">Title *</Label>
                        <input
                          ref={(el) => {
                            if (formRefs.current) formRefs.current.title = el
                          }}
                          id="title"
                          placeholder="Story title"
                          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <Label htmlFor="description">Description</Label>
                        <textarea
                          ref={(el) => {
                            if (formRefs.current) formRefs.current.description = el
                          }}
                          id="description"
                          placeholder="Detailed description"
                          rows={3}
                          className="mt-1 resize-none flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select 
                          value={selectData.type}
                          onValueChange={(value) => setSelectData(prev => ({...prev, type: value as typeof selectData.type}))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="story">Story</SelectItem>
                            <SelectItem value="task">Task</SelectItem>
                            <SelectItem value="bug">Bug</SelectItem>
                            <SelectItem value="spike">Spike</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="selected-epic">Selected Epic</Label>
                        <div className="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-input">
                          {selectedEpicId === "no-epic" ? (
                            <span className="text-sm text-muted-foreground">No Epic Selected</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              {(() => {
                                const selectedEpic = epics.find(epic => epic.id === selectedEpicId)
                                if (!selectedEpic) return <span className="text-sm text-muted-foreground">No Epic Selected</span>
                                return (
                                  <>
                                    <div 
                                      className="w-4 h-4 rounded-sm flex items-center justify-center"
                                      style={{ backgroundColor: selectedEpic.color + '20', color: selectedEpic.color }}
                                    >
                                      {selectedEpic.icon ? renderEpicIcon(selectedEpic.icon, "h-3 w-3") : <FileText className="h-3 w-3" />}
                                    </div>
                                    <span className="text-sm font-medium">{selectedEpic.name}</span>
                                  </>
                                )
                              })()} 
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Epic was selected during template selection</p>
                      </div>
                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select 
                          value={selectData.priority}
                          onValueChange={(value) => setSelectData(prev => ({...prev, priority: value as typeof selectData.priority}))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Must Have">Must Have</SelectItem>
                            <SelectItem value="Should Have">Should Have</SelectItem>
                            <SelectItem value="Could Have">Could Have</SelectItem>
                            <SelectItem value="Won't Have">Won&apos;t Have</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* User Story Format */}
                  {selectData.type === "story" && (
                    <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <h3 className="text-lg font-medium">User Story Format</h3>
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="asA">As a</Label>
                          <input
                            ref={(el) => {
                              if (formRefs.current) formRefs.current.asA = el
                            }}
                            id="asA"
                            placeholder="user role"
                            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <Label htmlFor="iWant">I want</Label>
                          <input
                            ref={(el) => {
                              if (formRefs.current) formRefs.current.iWant = el
                            }}
                            id="iWant"
                            placeholder="functionality desired"
                            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <Label htmlFor="soThat">So that</Label>
                          <input
                            ref={(el) => {
                              if (formRefs.current) formRefs.current.soThat = el
                            }}
                            id="soThat"
                            placeholder="business value achieved"
                            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Business & Estimation */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Business Details */}
                    <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <h3 className="text-lg font-medium">Business Details</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="businessValue">Business Value (1-10)</Label>
                          <Input
                            id="businessValue"
                            type="number"
                            min="1"
                            max="10"
                            value={selectData.businessValue}
                            onChange={(e) => setSelectData(prev => ({...prev, businessValue: parseInt(e.target.value)}))}
                            className="mt-1 w-24"
                          />
                        </div>
                        <div>
                          <Label htmlFor="riskLevel">Risk Level</Label>
                          <Select 
                            value={selectData.riskLevel}
                            onValueChange={(value) => setSelectData(prev => ({...prev, riskLevel: value as typeof selectData.riskLevel}))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                              <SelectItem value="Critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="complexity">Complexity</Label>
                          <Select 
                            value={selectData.complexity}
                            onValueChange={(value) => setSelectData(prev => ({...prev, complexity: value as typeof selectData.complexity}))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Simple">Simple</SelectItem>
                              <SelectItem value="Moderate">Moderate</SelectItem>
                              <SelectItem value="Complex">Complex</SelectItem>
                              <SelectItem value="Epic">Epic</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Estimation */}
                    <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <h3 className="text-lg font-medium">Estimation</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="storyPoints">Story Points</Label>
                          <Input
                            id="storyPoints"
                            type="number"
                            value={selectData.storyPoints || ""}
                            onChange={(e) => setSelectData(prev => ({...prev, storyPoints: e.target.value ? parseInt(e.target.value) : undefined}))}
                            placeholder="Optional"
                            className="mt-1 w-24"
                          />
                        </div>
                        <div>
                          <Label htmlFor="timeEstimate">Time Estimate</Label>
                          <input
                            ref={(el) => {
                              if (formRefs.current) formRefs.current.timeEstimate = el
                            }}
                            id="timeEstimate"
                            placeholder="2-4 hours, 1-2 days"
                            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <Label htmlFor="confidence">Confidence</Label>
                          <Select 
                            value={selectData.estimationConfidence}
                            onValueChange={(value) => setSelectData(prev => ({...prev, estimationConfidence: value as typeof selectData.estimationConfidence}))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acceptance Criteria */}
                  <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Acceptance Criteria</h3>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddAcceptanceCriterion}>
                        <Plus className="mr-1 h-4 w-4" />
                        Add Criteria
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {acceptanceCriteria.map((criteria, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm">
                          <span className="text-sm text-gray-500 mt-1">{index + 1}.</span>
                          <span className="flex-1 text-sm">{criteria}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAcceptanceCriterion(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      {showCriterionInput && (
                        <div className="flex items-center gap-2">
                          <Input
                            value={newCriterionInput}
                            onChange={(e) => setNewCriterionInput(e.target.value)}
                            placeholder="Enter acceptance criteria..."
                            className="flex-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveCriterion()
                              if (e.key === 'Escape') handleCancelCriterion()
                            }}
                            autoFocus
                          />
                          <Button type="button" size="sm" onClick={handleSaveCriterion}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={handleCancelCriterion}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Labels</h3>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddLabel}>
                        <Plus className="mr-1 h-4 w-4" />
                        Add Label
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm min-h-[3rem]">
                        {labels.map((label) => (
                          <div 
                            key={label} 
                            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-150 bg-white dark:bg-gray-700 text-black dark:text-white border border-gray-200 dark:border-gray-600 rounded px-3 py-1 text-sm flex items-center gap-1 flex-shrink-0 whitespace-nowrap"
                            onClick={() => handleRemoveLabel(label)}
                          >
                            {label}
                            <X className="ml-1 h-3 w-3" />
                          </div>
                        ))}
                        {labels.length === 0 && (
                          <span className="text-sm text-gray-400 flex items-center">No labels added yet</span>
                        )}
                      </div>
                      
                      {showLabelInput && (
                        <div className="flex items-center gap-2">
                          <Input
                            value={newLabelInput}
                            onChange={(e) => setNewLabelInput(e.target.value)}
                            placeholder="Enter label..."
                            className="flex-1 max-w-xs"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveLabel()
                              if (e.key === 'Escape') handleCancelLabel()
                            }}
                            autoFocus
                          />
                          <Button type="button" size="sm" onClick={handleSaveLabel}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={handleCancelLabel}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-800">
          {currentStep === "template" ? (
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Fields marked with * are required
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleCreateStory} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditing ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {isEditing ? "Update Story" : "Create Story"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}