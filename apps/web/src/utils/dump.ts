import React from 'react';

export const dump = (props: unknown) => {
    return React.createElement(
        'pre',
        { style: { width: '100%', height: '20vh', overflow: 'auto' } },
        JSON.stringify(props, null, 4)
    );
};
