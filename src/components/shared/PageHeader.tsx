// src/components/shared/PageHeader.tsx
interface PageHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode;
  }
  
  export default function PageHeader({ title, description, children }: PageHeaderProps) {
    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
        {children}
      </div>
    );
  }