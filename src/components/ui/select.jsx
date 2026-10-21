"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

function useIsMobileTouch() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 && 'ontouchstart' in window);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

const SelectContext = React.createContext({ isMobileDrawer: false });

const Select = ({ children, value, onValueChange, ...props }) => {
  const isMobile = useIsMobileTouch();
  // Registry por instância — evita conflito entre múltiplos Selects na mesma página
  const instanceRegistry = React.useRef([]);

  if (!isMobile) {
    return (
      <SelectContext.Provider value={{ isMobileDrawer: false, instanceRegistry }}>
        <SelectPrimitive.Root value={value} onValueChange={onValueChange} {...props}>
          {children}
        </SelectPrimitive.Root>
      </SelectContext.Provider>
    );
  }

  return (
    <SelectContext.Provider value={{ isMobileDrawer: true, value, onValueChange, instanceRegistry }}>
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} {...props}>
        {children}
      </SelectPrimitive.Root>
    </SelectContext.Provider>
  );
};

const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const { isMobileDrawer } = React.useContext(SelectContext);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  if (isMobileDrawer) {
    return (
      <MobileSelectTrigger
        ref={ref}
        className={className}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        {...props}
      >
        {children}
      </MobileSelectTrigger>
    );
  }

  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', ...props.style }}
      {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = "SelectTrigger"

const MobileSelectTrigger = React.forwardRef(({ className, children, drawerOpen, setDrawerOpen, ...props }, ref) => {
  const triggerRef = React.useRef(null);

  // Get the parent Select's children to find SelectContent
  return (
    <>
      <button
        ref={ref || triggerRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDrawerOpen(true);
        }}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', ...props.style }}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      <MobileDrawerPortal open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
});
MobileSelectTrigger.displayName = "MobileSelectTrigger"

// This component collects items from the nearest SelectContent and renders them in a Drawer
const MobileDrawerPortal = ({ open, onClose }) => {
  const { value, onValueChange, instanceRegistry } = React.useContext(SelectContext);
  const [items, setItems] = React.useState([]);

  React.useEffect(() => {
    if (open) {
      // Usar o registry da instância — não o global
      setItems([...(instanceRegistry?.current || [])]);
    }
  }, [open]);

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent className="bg-[#1a1a1a] border-[#2a2a2a] max-h-[70vh]">
        <DrawerHeader>
          <DrawerTitle className="text-white text-center">Selecione uma opção</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 overflow-y-auto max-h-[55vh] safe-area-bottom pb-4">
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled && onValueChange) {
                  onValueChange(item.value);
                }
                onClose();
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-4 py-3.5 text-sm transition-colors mb-1",
                value === item.value
                  ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                  : "text-white hover:bg-[#2a2a2a]",
                item.disabled && "opacity-50 pointer-events-none"
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span>{item.label}</span>
              {value === item.value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
};


const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
  const { isMobileDrawer } = React.useContext(SelectContext);

  // On mobile, register children items then hide the radix content
  if (isMobileDrawer) {
    return (
      <MobileSelectContent>{children}</MobileSelectContent>
    );
  }

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-[60vh] min-w-[8rem] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn("p-1", position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = "SelectContent"

// Invisible component that registers children for the mobile drawer (por instância)
function MobileSelectContent({ children }) {
  const { instanceRegistry } = React.useContext(SelectContext);

  React.useEffect(() => {
    const items = [];
    React.Children.forEach(children, (child) => {
      if (child && child.props && child.props.value !== undefined) {
        items.push({
          value: child.props.value,
          label: typeof child.props.children === 'string' ? child.props.children : child.props.value,
          disabled: !!child.props.disabled,
        });
      }
    });
    if (instanceRegistry) {
      instanceRegistry.current = items;
    }
  }, [children]);

  return null;
}

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props} />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => {
  const { isMobileDrawer } = React.useContext(SelectContext);

  if (isMobileDrawer) {
    // Items are rendered by MobileDrawerPortal, not here
    return null;
  }

  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', ...props.style }}
      {...props}>
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = "SelectItem"

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}