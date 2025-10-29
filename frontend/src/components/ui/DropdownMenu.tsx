import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { cn } from '@/utils/cn';

interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  items,
  align = 'right',
  className,
}) => {
  return (
    <Menu as="div" className={cn('relative inline-block text-left', className)}>
      <Menu.Button className="inline-flex items-center justify-center w-full">
        {trigger}
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={cn(
            'absolute z-50 mt-2 w-56 origin-top-right rounded-xl bg-surface/95 backdrop-blur-xl border border-border/50 shadow-soft-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden',
            align === 'left' ? 'left-0' : 'right-0'
          )}
        >
          <div className="py-1">
            {items.map((item, index) => (
              <Fragment key={index}>
                {item.divider ? (
                  <div className="my-1 border-t border-border/50" />
                ) : (
                  <Menu.Item disabled={item.disabled}>
                    {({ active }) => (
                      <button
                        onClick={item.onClick}
                        className={cn(
                          'group flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                          active && !item.disabled && 'bg-primary/10',
                          item.disabled && 'opacity-50 cursor-not-allowed',
                          item.danger
                            ? 'text-danger hover:bg-danger/10'
                            : 'text-text-primary hover:text-primary'
                        )}
                        disabled={item.disabled}
                      >
                        {item.icon && (
                          <span className="flex-shrink-0">{item.icon}</span>
                        )}
                        <span className="flex-1 text-left">{item.label}</span>
                      </button>
                    )}
                  </Menu.Item>
                )}
              </Fragment>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default DropdownMenu;