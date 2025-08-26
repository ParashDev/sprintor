"use client"

import React, { useState } from "react"

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateProject: (data: {
    name: string
    description: string
    companyName: string
    projectType: string
    estimationMethod: string
    sprintDuration: string
  }) => void
}

export function CreateProjectModal({ open, onOpenChange, onCreateProject }: CreateProjectModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [projectType, setProjectType] = useState("")
  const [estimationMethod, setEstimationMethod] = useState("")
  const [sprintDuration, setSprintDuration] = useState("")
  const [creating, setCreating] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) return
    
    setCreating(true)
    try {
      await onCreateProject({
        name: name.trim(),
        description: description.trim(),
        companyName: companyName.trim(),
        projectType,
        estimationMethod,
        sprintDuration
      })
      
      // Reset form
      setName("")
      setDescription("")
      setCompanyName("")
      setProjectType("")
      setEstimationMethod("")
      setSprintDuration("")
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating project:', error)
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
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-muted">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Create New Project
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Set up a new agile project with planning poker configuration
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-accent rounded-md transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-[60vh] overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Basic Information */}
              <div className="space-y-4 p-6 bg-muted/30 border border-border rounded-lg">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Project Name *</label>
                    <input
                      type="text"
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="e.g., E-commerce Platform"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Company/Organization</label>
                    <input
                      type="text"
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="e.g., Acme Corporation"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Project Description</label>
                  <textarea
                    className="mt-1 resize-none flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Brief description of what this project aims to achieve..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Project Configuration */}
              <div className="space-y-4 p-6 bg-muted/30 border border-border rounded-lg">
                <h3 className="text-lg font-medium">Project Configuration</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Project Type</label>
                    <select
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                    >
                      <option value="">Select project type</option>
                      <option value="web">Web Application</option>
                      <option value="mobile">Mobile Application</option>
                      <option value="api">API/Backend</option>
                      <option value="infrastructure">Infrastructure</option>
                      <option value="data">Data/Analytics</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Default Estimation Method</label>
                    <select
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={estimationMethod}
                      onChange={(e) => setEstimationMethod(e.target.value)}
                    >
                      <option value="">Select estimation method</option>
                      <option value="fibonacci">Fibonacci (1, 2, 3, 5, 8, 13...)</option>
                      <option value="tshirt">T-Shirt Sizes (XS, S, M, L, XL)</option>
                      <option value="powers">Powers of 2 (1, 2, 4, 8, 16...)</option>
                      <option value="linear">Linear (1, 2, 3, 4, 5...)</option>
                      <option value="custom">Custom Scale</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Default Sprint Duration</label>
                    <select
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={sprintDuration}
                      onChange={(e) => setSprintDuration(e.target.value)}
                    >
                      <option value="">Select sprint duration</option>
                      <option value="1">1 Week</option>
                      <option value="2">2 Weeks</option>
                      <option value="3">3 Weeks</option>
                      <option value="4">4 Weeks</option>
                    </select>
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
              <button 
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                onClick={() => onOpenChange(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button 
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 h-10 rounded-md px-6"
                onClick={handleSubmit}
                disabled={creating || !name.trim()}
              >
                {creating ? (
                  <>
                    <svg className="mr-2 h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m8-8h-4M6 12H2m15.5 5.5l-3-3M9.5 9.5l-3-3m12-3l-3 3M6.5 17.5l-3-3" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}