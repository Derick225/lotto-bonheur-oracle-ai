import { Suspense, lazy, ComponentType, useState, useEffect } from 'react';
import { useIntersectionObserver } from '@/services/performanceService';
import { Loader2 } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Composant d'image avec lazy loading
 */
export function LazyImage({
  src,
  alt,
  className = '',
  width,
  height,
  placeholder,
  onLoad,
  onError
}: LazyImageProps) {
  const [ref, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px'
  });

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setImageError(true);
    onError?.();
  };

  // Placeholder par défaut
  const defaultPlaceholder = `data:image/svg+xml;base64,${btoa(`
    <svg width="${width || 200}" height="${height || 200}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">
        ${imageError ? 'Erreur' : 'Chargement...'}
      </text>
    </svg>
  `)}`;

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {!isIntersecting ? (
        // Placeholder avant intersection
        <img
          src={placeholder || defaultPlaceholder}
          alt={alt}
          className="w-full h-full object-cover"
          width={width}
          height={height}
        />
      ) : (
        <>
          {/* Image réelle */}
          <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            width={width}
            height={height}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
          />
          
          {/* Overlay de chargement */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}
          
          {/* Overlay d'erreur */}
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center text-gray-500">
                <div className="text-sm">Erreur de chargement</div>
                <div className="text-xs">{alt}</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
}

/**
 * Composant wrapper pour le lazy loading de composants
 */
export function LazyComponent({
  children,
  fallback,
  className = '',
  threshold = 0.1,
  rootMargin = '50px'
}: LazyComponentProps) {
  const [ref, isIntersecting] = useIntersectionObserver({
    threshold,
    rootMargin
  });

  const defaultFallback = (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );

  return (
    <div ref={ref} className={className}>
      {isIntersecting ? children : (fallback || defaultFallback)}
    </div>
  );
}

/**
 * HOC pour créer des composants lazy
 */
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function LazyWrappedComponent(props: P) {
    return (
      <LazyComponent fallback={fallback}>
        <Component {...props} />
      </LazyComponent>
    );
  };
}

/**
 * Utilitaire pour créer des composants lazy avec React.lazy
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComp = lazy(importFn);
  
  return function LazyComponentWrapper(props: React.ComponentProps<T>) {
    const defaultFallback = (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Chargement du composant...</span>
      </div>
    );

    return (
      <Suspense fallback={fallback || defaultFallback}>
        <LazyComp {...props} />
      </Suspense>
    );
  };
}

/**
 * Composant de skeleton pour le chargement
 */
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  width = '100%',
  height = '1rem',
  variant = 'text',
  animation = 'pulse'
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full'
  };
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse', // Simplifié pour cet exemple
    none: ''
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  };

  return (
    <div
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${animationClasses[animation]}
        ${className}
      `}
      style={style}
    />
  );
}

/**
 * Composant de grille de skeletons
 */
interface SkeletonGridProps {
  count: number;
  className?: string;
  itemClassName?: string;
  cols?: number;
}

export function SkeletonGrid({
  count,
  className = '',
  itemClassName = '',
  cols = 3
}: SkeletonGridProps) {
  return (
    <div className={`grid grid-cols-${cols} gap-4 ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`space-y-2 ${itemClassName}`}>
          <Skeleton height="200px" variant="rectangular" />
          <Skeleton width="60%" />
          <Skeleton width="40%" />
        </div>
      ))}
    </div>
  );
}

/**
 * Hook pour précharger des composants
 */
export function usePreloadComponent(
  importFn: () => Promise<any>,
  condition: boolean = true
) {
  useEffect(() => {
    if (condition) {
      // Précharger le composant
      importFn().catch(console.error);
    }
  }, [importFn, condition]);
}

/**
 * Composant pour précharger des ressources
 */
interface PreloaderProps {
  resources: Array<{
    href: string;
    as: 'script' | 'style' | 'image' | 'font';
    type?: string;
    crossOrigin?: string;
  }>;
}

export function Preloader({ resources }: PreloaderProps) {
  useEffect(() => {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      
      if (resource.type) {
        link.type = resource.type;
      }
      
      if (resource.crossOrigin) {
        link.crossOrigin = resource.crossOrigin;
      }
      
      document.head.appendChild(link);
    });

    // Nettoyer au démontage
    return () => {
      resources.forEach(resource => {
        const existingLink = document.querySelector(
          `link[rel="preload"][href="${resource.href}"]`
        );
        if (existingLink) {
          document.head.removeChild(existingLink);
        }
      });
    };
  }, [resources]);

  return null; // Ce composant ne rend rien
}

/**
 * Composant d'image progressive (charge d'abord une version basse qualité)
 */
interface ProgressiveImageProps {
  src: string;
  placeholderSrc: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export function ProgressiveImage({
  src,
  placeholderSrc,
  alt,
  className = '',
  width,
  height
}: ProgressiveImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [ref, isIntersecting] = useIntersectionObserver();

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Image placeholder (basse qualité) */}
      <img
        src={placeholderSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        width={width}
        height={height}
      />
      
      {/* Image haute qualité */}
      {isIntersecting && (
        <img
          src={src}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          width={width}
          height={height}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />
      )}
    </div>
  );
}
