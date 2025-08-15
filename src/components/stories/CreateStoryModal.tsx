"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { createStory, getStoryTemplates } from "@/lib/story-service"
import type { StoryTemplate } from "@/types/story"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FormField } from "./FormField"
// Removed shadcn Dialog - using custom modal
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
  Check
} from "lucide-react"

interface CreateStoryModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onStoryCreated: () => void
}

export default function CreateStoryModal({ 
  isOpen, 
  onClose, 
  projectId, 
  onStoryCreated 
}: CreateStoryModalProps) {
  // Lock the projectId when modal opens - similar to how sessionId works
  const [lockedProjectId, setLockedProjectId] = useState<string>('')
  const { user } = useAuth()
  
  // Template state
  const [templates, setTemplates] = useState<StoryTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<StoryTemplate | null>(null)
  const [templateSearch, setTemplateSearch] = useState("")
  const [templateCategory, setTemplateCategory] = useState<string>("all")
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  
  // Form refs for uncontrolled inputs - much faster!
  const formRefs = useRef({
    title: null as HTMLInputElement | null,
    description: null as HTMLTextAreaElement | null,
    asA: null as HTMLInputElement | null,
    iWant: null as HTMLInputElement | null,
    soThat: null as HTMLInputElement | null,
    timeEstimate: null as HTMLInputElement | null,
  })
  
  // Minimal state for selects only (they need controlled state)
  const [selectData, setSelectData] = useState({
    type: "story" as "story" | "epic" | "task" | "bug" | "spike",
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

  // Lock projectId when modal opens and load templates
  useEffect(() => {
    if (isOpen && projectId) {
      setLockedProjectId(projectId) // Lock the projectId when modal opens
      loadTemplates()
    } else if (!isOpen) {
      setLockedProjectId('') // Clear when modal closes
    }
  }, [isOpen, projectId])

  const loadTemplates = async () => {
    setLoadingTemplates(true)
    try {
      // Use lockedProjectId if available, fallback to projectId
      const projectIdToUse = lockedProjectId || projectId
      const projectTemplates = await getStoryTemplates(projectIdToUse)
      setTemplates(projectTemplates)
    } catch (error) {
      console.error("Error loading templates:", error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  // Filter templates based on search and category - memoized to avoid re-filtering on every render
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                           template.description.toLowerCase().includes(templateSearch.toLowerCase())
      const matchesCategory = templateCategory === "all" || template.category === templateCategory
      return matchesSearch && matchesCategory
    })
  }, [templates, templateSearch, templateCategory])

  // Template selection - populate refs directly (super fast!)
  const handleTemplateSelect = useCallback((template: StoryTemplate) => {
    setSelectedTemplate(template)
    setCurrentStep("form")
    
    // Populate input refs directly - no state updates, no re-renders!
    setTimeout(() => {
      if (formRefs.current.title) formRefs.current.title.value = `${template.name} - `
      if (formRefs.current.description) formRefs.current.description.value = template.description
      if (formRefs.current.asA) formRefs.current.asA.value = template.asA
      if (formRefs.current.iWant) formRefs.current.iWant.value = template.iWant
      if (formRefs.current.soThat) formRefs.current.soThat.value = template.soThat
      if (formRefs.current.timeEstimate) formRefs.current.timeEstimate.value = template.defaultTimeEstimate || ""
    }, 0)
    
    // Only update essential selects that need React state
    setSelectData({
      type: template.category === "epic" ? "epic" : "story",
      businessValue: template.defaultBusinessValue,
      priority: template.defaultPriority,
      riskLevel: template.riskLevel,
      complexity: template.complexity,
      storyPoints: template.suggestedStoryPoints?.[1],
      estimationConfidence: "Medium"
    })
    
    setAcceptanceCriteria(template.defaultAcceptanceCriteria)
    setLabels(template.suggestedLabels)
  }, [])

  const handleStartFromScratch = useCallback(() => {
    setSelectedTemplate(null)
    
    // Clear all input refs
    if (formRefs.current.title) formRefs.current.title.value = ""
    if (formRefs.current.description) formRefs.current.description.value = ""
    if (formRefs.current.asA) formRefs.current.asA.value = ""
    if (formRefs.current.iWant) formRefs.current.iWant.value = ""
    if (formRefs.current.soThat) formRefs.current.soThat.value = ""
    if (formRefs.current.timeEstimate) formRefs.current.timeEstimate.value = ""
    
    // Reset select data to defaults
    setSelectData({
      type: "story",
      businessValue: 5,
      priority: "Should Have",
      riskLevel: "Medium",
      complexity: "Moderate",
      storyPoints: undefined,
      estimationConfidence: "Medium"
    })
    
    setAcceptanceCriteria([])
    setLabels([])
    setCurrentStep("form")
  }, [])

  // Handlers for acceptance criteria and labels

  const handleAddAcceptanceCriterion = useCallback(() => {
    setShowCriterionInput(true)
  }, [])

  const handleSaveCriterion = useCallback(() => {
    if (newCriterionInput.trim()) {
      setAcceptanceCriteria(prev => [newCriterionInput.trim(), ...prev])
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

  const handleAddLabel = useCallback(() => {
    setShowLabelInput(true)
  }, [])

  const handleSaveLabel = useCallback(() => {
    if (newLabelInput.trim() && !labels.includes(newLabelInput.trim())) {
      setLabels(prev => [...prev, newLabelInput.trim()])
      setNewLabelInput("")
    }
    setShowLabelInput(false)
  }, [newLabelInput, labels])

  const handleCancelLabel = useCallback(() => {
    setNewLabelInput("")
    setShowLabelInput(false)
  }, [])

  const handleRemoveLabel = useCallback((label: string) => {
    setLabels(prev => prev.filter(l => l !== label))
  }, [])

  // Submit story - read values from refs
  const handleCreateStory = async () => {
    const title = formRefs.current.title?.value || ""
    if (!user || !title.trim()) return
    
    // Use the locked projectId - this ensures story goes to the right project
    const projectIdToUse = lockedProjectId || projectId
    
    setCreating(true)
    try {
      await createStory({
        title,
        description: formRefs.current.description?.value || "",
        type: selectData.type,
        asA: formRefs.current.asA?.value || "",
        iWant: formRefs.current.iWant?.value || "",
        soThat: formRefs.current.soThat?.value || "",
        businessValue: selectData.businessValue,
        priority: selectData.priority,
        riskLevel: selectData.riskLevel,
        complexity: selectData.complexity,
        acceptanceCriteria: acceptanceCriteria.map((desc, i) => ({
          id: `ac_${i}`,
          description: desc,
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
        status: "backlog",
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
        projectId: projectIdToUse, // Use locked projectId
        createdFromTemplate: selectedTemplate?.id
      })
      
      onStoryCreated()
      onClose()
      
      // Reset form
      setCurrentStep("template")
      setSelectedTemplate(null)
      setTemplateSearch("")
      setTemplateCategory("all")
    } catch (error) {
      console.error("Error creating story:", error)
    } finally {
      setCreating(false)
    }
  }

  const handleClose = useCallback(() => {
    setCurrentStep("template")
    setSelectedTemplate(null)
    setTemplateSearch("")
    setTemplateCategory("all")
    onClose()
  }, [onClose])

  const getTypeIcon = useCallback((type: string) => {
    const icons = {
      "story": FileText,
      "epic": Target,
      "task": Zap,
      "bug": Bug,
      "spike": FlaskConical
    }
    const Icon = icons[type as keyof typeof icons] || FileText
    return <Icon className="h-4 w-4" />
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-xl w-[95vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] max-w-7xl max-h-[90vh] overflow-hidden border">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {currentStep === "template" ? "Choose a Template" : "Create Story"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {currentStep === "template" 
              ? "Select a template to quickly create a story with pre-filled information"
              : `Creating ${selectData.type} from ${selectedTemplate?.name || "scratch"}`
            }
          </p>
          
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-accent rounded-md transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentStep === "template" && (
            <div className="p-6 space-y-4">
            {/* Template Search & Filters */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={templateCategory} onValueChange={setTemplateCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleStartFromScratch} variant="outline" className="flex-1">
                <Plus className="mr-2 h-4 w-4" />
                Start from Scratch
              </Button>
            </div>

            {/* Template List */}
            <ScrollArea className="h-[400px]">
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredTemplates.map((template) => (
                    <Card 
                      key={template.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(template.category)}
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                            {template.isDefault && (
                              <Badge variant="secondary" className="text-xs">Popular</Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1 mb-2">
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
                        <div className="text-xs text-muted-foreground">
                          As a <strong>{template.asA}</strong>, I want {template.iWant}...
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
            </div>
          )}

          {currentStep === "form" && (
            <ScrollArea className="h-[500px] px-8 pb-4">
              <div className="space-y-6 px-4 pr-8 pb-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep("template")}
                  >
                    ← Back to Templates
                  </Button>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      ref={(el) => formRefs.current.title = el}
                      id="title"
                      placeholder="Story title"
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      ref={(el) => formRefs.current.description = el}
                      id="description"
                      placeholder="Detailed description"
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select 
                        value={selectData.type}
                        onValueChange={(value) => setSelectData(prev => ({...prev, type: value as any}))}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="story">Story</SelectItem>
                          <SelectItem value="epic">Epic</SelectItem>
                          <SelectItem value="task">Task</SelectItem>
                          <SelectItem value="bug">Bug</SelectItem>
                          <SelectItem value="spike">Spike</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select 
                        value={selectData.priority}
                        onValueChange={(value) => setSelectData(prev => ({...prev, priority: value as any}))}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Must Have">Must Have</SelectItem>
                          <SelectItem value="Should Have">Should Have</SelectItem>
                          <SelectItem value="Could Have">Could Have</SelectItem>
                          <SelectItem value="Won't Have">Won't Have</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Story Format */}
              {selectData.type === "story" && (
                <div className="space-y-6">
                  <h4 className="font-medium text-lg">User Story Format</h4>
                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="asA">As a</Label>
                      <Input
                        ref={(el) => formRefs.current.asA = el}
                        id="asA"
                        placeholder="user role"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="iWant">I want</Label>
                      <Input
                        ref={(el) => formRefs.current.iWant = el}
                        id="iWant"
                        placeholder="functionality desired"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="soThat">So that</Label>
                      <Input
                        ref={(el) => formRefs.current.soThat = el}
                        id="soThat"
                        placeholder="business value achieved"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Business Details */}
              <div className="space-y-6">
                <h4 className="font-medium text-lg">Business Details</h4>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="businessValue">Business Value (1-10)</Label>
                    <Input
                      id="businessValue"
                      type="number"
                      min="1"
                      max="10"
                      value={selectData.businessValue}
                      onChange={(e) => setSelectData(prev => ({...prev, businessValue: parseInt(e.target.value)}))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="riskLevel">Risk Level</Label>
                    <Select 
                      value={selectData.riskLevel}
                      onValueChange={(value) => setSelectData(prev => ({...prev, riskLevel: value as any}))}
                    >
                      <SelectTrigger className="h-11">
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
                  <div className="space-y-2">
                    <Label htmlFor="complexity">Complexity</Label>
                    <Select 
                      value={selectData.complexity}
                      onValueChange={(value) => setSelectData(prev => ({...prev, complexity: value as any}))}
                    >
                      <SelectTrigger className="h-11">
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
              <div className="space-y-6">
                <h4 className="font-medium text-lg">Estimation</h4>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="storyPoints">Story Points</Label>
                    <Input
                      id="storyPoints"
                      type="number"
                      value={selectData.storyPoints || ""}
                      onChange={(e) => setSelectData(prev => ({...prev, storyPoints: e.target.value ? parseInt(e.target.value) : undefined}))}
                      placeholder="Optional"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeEstimate">Time Estimate</Label>
                    <Input
                      ref={(el) => formRefs.current.timeEstimate = el}
                      id="timeEstimate"
                      placeholder="2-4 hours, 1-2 days"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confidence">Confidence</Label>
                    <Select 
                      value={selectData.estimationConfidence}
                      onValueChange={(value) => setSelectData(prev => ({...prev, estimationConfidence: value as any}))}
                    >
                      <SelectTrigger className="h-11">
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

              {/* Acceptance Criteria */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-lg">Acceptance Criteria</h4>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddAcceptanceCriterion}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Criterion
                  </Button>
                </div>
                <div className="space-y-2">
                  {/* Inline input for new criterion - shows at top */}
                  {showCriterionInput && (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newCriterionInput}
                        onChange={(e) => setNewCriterionInput(e.target.value)}
                        placeholder="Enter acceptance criterion..."
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveCriterion()
                          if (e.key === 'Escape') handleCancelCriterion()
                        }}
                        autoFocus
                      />
                      <Button type="button" size="sm" onClick={handleSaveCriterion}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={handleCancelCriterion}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  {acceptanceCriteria.map((criterion, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="flex-1 p-3 border rounded-md text-sm bg-muted/30">
                        {criterion}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAcceptanceCriterion(index)}
                        className="mt-1"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Labels */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-lg">Labels</h4>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddLabel}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Label
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {labels.map((label) => (
                      <Badge key={label} variant="secondary" className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors" onClick={() => handleRemoveLabel(label)}>
                        {label}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Inline input for new label */}
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
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={handleCancelLabel}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
                </div>
              </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-muted/30">
          {currentStep === "template" ? (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleCreateStory} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create Story
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}