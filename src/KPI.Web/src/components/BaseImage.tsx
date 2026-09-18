// components/BaseImage.tsx
'use client';

import Image, { ImageProps } from 'next/image';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation'; // ⚠️ 注意這是 from 'next/navigation'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function BaseImage(props: ImageProps) {
    const newSrc =
        typeof props.src === 'string' && props.src.startsWith('/')
            ? basePath + props.src
            : props.src;

    return <Image {...props} src={newSrc} />;
}