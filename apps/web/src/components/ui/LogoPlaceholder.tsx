import { FaBoxOpen } from 'react-icons/fa';

interface LogoProps {
    size?: number;
    className?: string;
}

export default function LogoPlaceholder({ size = 40, className = '' }: LogoProps) {
    return (
        <div className={`text-primary ${className}`}>
            <FaBoxOpen size={size} />
        </div>
    );
}
