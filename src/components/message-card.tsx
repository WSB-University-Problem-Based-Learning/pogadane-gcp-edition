import { cn } from "@/lib/utils"
import { ConversationRole } from "@/types"

interface Props {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  isError?: boolean
  role: ConversationRole
}

export const MessageCard: React.FC<Props> = ({ icon, title, children, isError, role }) => {
  return (
    <div className={`flex items-start gap-4 ${role === 'user' && 'flex-row-reverse'}`}>
      <span className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center", isError ? "bg-red-100 text-red-600" : "bg-secondary/80 text-primary")}>
        {icon}
      </span>
      <div className="flex-grow bg-card rounded-xl p-4 border border-border shadow-sm">
        <h3 className={cn("font-semibold text-primary mb-2", isError && "text-red-700")}>{title}</h3>
        <div className="text-muted-foreground text-sm break-words whitespace-pre-wrap">
          {children}
        </div>
      </div>
    </div>
  )
}
