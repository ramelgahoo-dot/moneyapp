'use client'

export default function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <div className="min-w-full md:min-w-auto">
        {children}
      </div>
    </div>
  )
}
