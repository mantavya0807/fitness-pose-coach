import React, { createContext, useContext, useState } from 'react';
import { cn } from "../../lib/utils";

const TabsContext = createContext({
  value: undefined,
  onValueChange: () => {},
});

export function Tabs({ value, onValueChange, children, className, ...props }) {
  const [tabValue, setTabValue] = useState(value);
  
  const handleValueChange = (newValue) => {
    setTabValue(newValue);
    onValueChange?.(newValue);
  };
  
  return (
    <TabsContext.Provider value={{ value: tabValue, onValueChange: handleValueChange }}>
      <div className={cn("", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className, ...props }) {
  return (
    <div className={cn("flex items-center gap-2 border-b", className)} {...props}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className, ...props }) {
  const { value: selectedValue, onValueChange } = useContext(TabsContext);
  const isActive = selectedValue === value;
  
  return (
    <button
      className={cn(`px-4 py-2 relative text-center transition-all ${isActive 
        ? 'border-b-2 border-primary text-primary font-medium' 
        : 'text-muted-foreground hover:text-foreground'}`, 
        className
      )}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className, ...props }) {
  const { value: selectedValue } = useContext(TabsContext);
  
  if (selectedValue !== value) {
    return null;
  }
  
  return (
    <div className={cn("mt-4", className)} {...props}>
      {children}
    </div>
  );
}