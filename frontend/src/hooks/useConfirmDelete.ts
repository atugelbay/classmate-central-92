import { useState } from "react";

interface UseConfirmDeleteReturn {
  isOpen: boolean;
  itemId: string | null;
  open: (id: string) => void;
  close: () => void;
  confirm: () => void;
}

export function useConfirmDelete(onConfirm: (id: string) => void | Promise<void>): UseConfirmDeleteReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);

  const open = (id: string) => {
    setItemId(id);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setItemId(null);
  };

  const confirm = async () => {
    if (itemId) {
      await onConfirm(itemId);
      close();
    }
  };

  return {
    isOpen,
    itemId,
    open,
    close,
    confirm,
  };
}

