export const QFinanceBrand = () => (
    <div className="qfinance-brand" role="img" aria-label="QFinance — Let's fix your credit">
        <svg
            className="qfinance-brand__mark"
            viewBox="0 0 64 64"
            aria-hidden="true"
            focusable="false"
        >
            <circle cx="29" cy="29" r="20" fill="none" stroke="currentColor" strokeWidth="7" />
            <path
                d="M43 43 56 56"
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
            />
        </svg>

        <span className="qfinance-brand__copy" aria-hidden="true">
            <span className="qfinance-brand__name">
                <span className="qfinance-brand__accent">FIN</span>
                <span>ANCE</span>
            </span>
            <span className="qfinance-brand__tagline">Let's fix your credit</span>
        </span>
    </div>
);
