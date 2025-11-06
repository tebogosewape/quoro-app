import React from 'react';
import logo from '@/assets/logo.png';

interface AuthCardHeaderProps {
    title: string;
    subtitle?: string;
    showLogo?: boolean;
}

export const AuthCardHeader: React.FC<AuthCardHeaderProps> = ({
    title,
    subtitle,
    showLogo = true,
}) => {
    return (
        <div className="login-header">
            <div className="login-header-content">
                {showLogo && <img src={logo} alt="QMART ZAMBIA" className="login-logo" />}
                <h1 className="login-title">{title}</h1>
                {subtitle ? <p className="login-subtitle">{subtitle}</p> : null}
            </div>
        </div>
    );
};
