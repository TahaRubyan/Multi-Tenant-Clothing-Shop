import React from 'react';
import { createPortal } from 'react-dom';

/**
 * ModalPortal Component
 * Teleports modals directly to document.body, completely preventing any CSS containment,
 * viewport clipping, transform trapping, or rogue white borders from parent containers.
 */
export const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') {
    return <>{children}</>;
  }
  return createPortal(children, document.body);
};

export default ModalPortal;
