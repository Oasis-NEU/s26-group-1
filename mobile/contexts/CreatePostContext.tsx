import { createContext, useContext, useState, useRef, type ReactNode } from "react";

interface CreatePostContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  onItemCreated: (item: any) => void;
  registerOnItemCreated: (cb: (item: any) => void) => void;
}

const CreatePostContext = createContext<CreatePostContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  onItemCreated: () => {},
  registerOnItemCreated: () => {},
});

export function CreatePostProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const callbackRef = useRef<((item: any) => void) | null>(null);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const registerOnItemCreated = (cb: (item: any) => void) => {
    callbackRef.current = cb;
  };

  const onItemCreated = (item: any) => {
    callbackRef.current?.(item);
    setIsOpen(false);
  };

  return (
    <CreatePostContext.Provider value={{ isOpen, open, close, onItemCreated, registerOnItemCreated }}>
      {children}
    </CreatePostContext.Provider>
  );
}

export const useCreatePost = () => useContext(CreatePostContext);
