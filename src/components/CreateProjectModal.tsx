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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 w-[600px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Create New Project</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Set up a new agile project with planning poker configuration</p>
        
        {/* Basic Information */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Basic Information</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Project Name *</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                placeholder="e.g., E-commerce Platform"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Company/Organization</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                placeholder="e.g., Acme Corporation"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Project Description</label>
            <textarea
              className="w-full p-2 border rounded"
              placeholder="Brief description of what this project aims to achieve..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Project Configuration */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Project Configuration</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Project Type</label>
              <select
                className="w-full p-2 border rounded"
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
                className="w-full p-2 border rounded"
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
                className="w-full p-2 border rounded"
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
        
        <div className="flex gap-2">
          <button 
            className="px-4 py-2 border rounded"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
            onClick={handleSubmit}
            disabled={creating || !name.trim()}
          >
            {creating ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  )
}