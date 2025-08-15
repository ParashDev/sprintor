import React, { memo } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface FormFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: "input" | "textarea"
  rows?: number
}

export const FormField = memo(function FormField({ 
  id, 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = "input",
  rows = 3 
}: FormFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {type === "textarea" ? (
        <Textarea
          id={id}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={rows}
        />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
        />
      )}
    </div>
  )
})