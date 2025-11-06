import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
    isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    isLoading = false,
    disabled,
    ...props
}) => {
    return (
        <button className={`btn btn-${variant}`} disabled={isLoading || disabled} {...props}>
            {isLoading ? 'Loading...' : children}
        </button>
    );
};

export default Button;
