import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePropertyCreate } from '@/contexts/PropertyCreateContext';
import { useSidebarContent } from '@/contexts/SidebarContentContext';
import { Upload, X, Video, ImageIcon, Loader2, AlertCircle, CheckCircle2, GripVertical, Star, AlertTriangle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import GalleryStatus from '../widgets/GalleryStatus';
import PhotoQualityScore from '../widgets/PhotoQualityScore';
import PhotographyTips from '../widgets/PhotographyTips';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Constantes de validação
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 20;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Constantes de otimização
const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1080;
const JPEG_QUALITY = 0.85; // 85% qualidade
const MAX_RETRIES = 3; // Tentativas de upload

// Tipos para controle de upload - agora na galeria
interface ImagePreviewItem {
  id: string;
  url: string;
  isUploading: boolean;
  progress: number;
  error?: string;
  file?: File;
}

// Componente de thumbnail sortable (arrastável)
interface SortablePhotoItemProps {
  item: ImagePreviewItem;
  index: number;
  isCover: boolean;
  onRemove: (index: number) => void;
  onSetAsCover: (index: number) => void;
  onRetry: (item: ImagePreviewItem) => void;
}

const SortablePhotoItem: React.FC<SortablePhotoItemProps> = ({
  item,
  index,
  isCover,
  onRemove,
  onSetAsCover,
  onRetry,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? 'cursor-grabbing' : ''}`}
    >
      <div className="relative">
        {/* Imagem */}
        <img
          src={item.url}
          alt={`Preview ${index + 1}`}
          className="w-full h-32 object-cover rounded-lg border border-border"
          loading="lazy"
        />

        {/* Handle de arrasto (só aparece se não estiver uploading) */}
        {!item.isUploading && !item.error && (
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
            title="Arrastar para reordenar"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        {/* Overlay de Upload */}
        {item.isUploading && (
          <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin mb-2" />
            <div className="w-3/4 bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-white h-1.5 rounded-full transition-all"
                style={{ width: `${item.progress}%` }}
              />
            </div>
            <p className="text-white text-xs mt-1">{item.progress}%</p>
          </div>
        )}

        {/* Overlay de Erro */}
        {item.error && (
          <div className="absolute inset-0 bg-red-500/80 rounded-lg flex flex-col items-center justify-center p-2">
            <AlertCircle className="w-6 h-6 text-white mb-1" />
            <p className="text-white text-[10px] text-center leading-tight mb-2">
              {item.error.substring(0, 50)}...
            </p>
            <button
              onClick={() => onRetry(item)}
              className="text-[10px] px-2 py-0.5 bg-white text-red-600 rounded font-medium hover:bg-gray-100"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Badge de Capa */}
        {isCover && !item.isUploading && !item.error && (
          <div className="absolute top-2 left-2 bg-secondary text-white text-xs px-2 py-1 rounded shadow-md flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            Capa
          </div>
        )}

        {/* Botões de Ação (top-right) */}
        {!item.isUploading && !item.error && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Botão Definir como Capa */}
            {!isCover && (
              <button
                onClick={() => onSetAsCover(index)}
                className="bg-secondary hover:bg-secondary/90 text-white p-1.5 rounded shadow-md"
                title="Definir como capa"
              >
                <Star className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Botão Remover */}
        {!item.isUploading && (
          <button
            onClick={() => onRemove(index)}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            aria-label={`Remover imagem ${index + 1}`}
          >
            <X size={14} />
          </button>
        )}

        {/* Ícone de Sucesso */}
        {!item.isUploading && !item.error && (
          <div className="absolute bottom-2 right-2 bg-green-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <CheckCircle2 className="w-3 h-3" />
          </div>
        )}
      </div>
    </div>
  );
};

const Step5Photos: React.FC = () => {
  const { formData, updateField, isEditMode } = usePropertyCreate();
  const { setSidebarContent } = useSidebarContent();
  const [imagePreviews, setImagePreviews] = useState<ImagePreviewItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Injetar conteúdo no sidebar direito
  // Memorizar conteúdo do sidebar
  const sidebarContent = useMemo(() => (
    <>
      <GalleryStatus />
      <PhotoQualityScore />
      <PhotographyTips />
    </>
  ), [formData.images, formData.videos]);

  // Injetar no sidebar
  useEffect(() => {
    setSidebarContent(sidebarContent);
    return () => setSidebarContent(null);
  }, [sidebarContent, setSidebarContent]);

  // Verificar se há uploads em andamento
  const isUploading = imagePreviews.some((img) => img.isUploading);

  // Prevenir navegação durante uploads
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = 'Uploads em andamento. Tem certeza que deseja sair? Os uploads serão cancelados.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUploading]);

  // Carregar fotos existentes quando em modo de edição
  // Flag para carregar apenas uma vez
  const [hasLoadedInitialImages, setHasLoadedInitialImages] = useState(false);
  
  useEffect(() => {
    // Só carregar se:
    // 1. Está em modo de edição
    // 2. Tem imagens para carregar
    // 3. Ainda não carregou
    // 4. A galeria está vazia (para não sobrescrever uploads em andamento)
    if (
      isEditMode && 
      formData.image_urls && 
      formData.image_urls.length > 0 && 
      !hasLoadedInitialImages &&
      imagePreviews.length === 0
    ) {
      const existingImages: ImagePreviewItem[] = formData.image_urls.map((url, index) => ({
        id: `existing-${index}`,
        url,
        isUploading: false,
        progress: 100,
      }));
      setImagePreviews(existingImages);
      setHasLoadedInitialImages(true);
    }
  }, [isEditMode, formData.image_urls, hasLoadedInitialImages, imagePreviews.length]);

  // Prevenir comportamento padrão do navegador ao arrastar arquivos
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDocumentDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Adicionar listeners ao documento
    document.addEventListener('dragenter', preventDefaults, false);
    document.addEventListener('dragleave', preventDefaults, false);
    document.addEventListener('dragover', preventDefaults, false);
    document.addEventListener('drop', handleDocumentDrop, false);

    // Cleanup
    return () => {
      document.removeEventListener('dragenter', preventDefaults, false);
      document.removeEventListener('dragleave', preventDefaults, false);
      document.removeEventListener('dragover', preventDefaults, false);
      document.removeEventListener('drop', handleDocumentDrop, false);
    };
  }, []);

  // Otimizar imagem antes do upload (redimensionar e comprimir)
  const optimizeImage = async (file: File): Promise<File> => {
    // Se já for pequeno, não precisa otimizar
    if (file.size < 500 * 1024) {
      return file;
    }

    try {
      return await new Promise<File>((resolve) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(file); // Fallback: retorna original
            return;
          }

          // Calcular novas dimensões mantendo aspect ratio
          let width = img.width;
          let height = img.height;

          if (width > MAX_IMAGE_WIDTH) {
            height = (height * MAX_IMAGE_WIDTH) / width;
            width = MAX_IMAGE_WIDTH;
          }
          if (height > MAX_IMAGE_HEIGHT) {
            width = (width * MAX_IMAGE_HEIGHT) / height;
            height = MAX_IMAGE_HEIGHT;
          }

          canvas.width = width;
          canvas.height = height;

          // Desenhar imagem redimensionada
          ctx.drawImage(img, 0, 0, width, height);

          // Converter para blob com compressão
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }

              const optimizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              // Mostrar quanto foi reduzido
              const reduction = ((1 - optimizedFile.size / file.size) * 100).toFixed(0);
              console.log(
                `✓ Imagem otimizada: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(
                  optimizedFile.size /
                  1024 /
                  1024
                ).toFixed(1)}MB (-${reduction}%)`
              );

              resolve(optimizedFile);
            },
            'image/jpeg',
            JPEG_QUALITY
          );
        };

        img.onerror = () => resolve(file); // Fallback: retorna original
        reader.onerror = () => resolve(file);

        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Erro ao otimizar imagem:', error);
      return file; // Fallback: retorna original
    }
  };

  // Validar arquivo
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo de arquivo não suportado: ${file.type}. Use JPG, PNG ou WEBP.`,
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo: 10MB.`,
      };
    }

    const currentTotal = imagePreviews.length;
    if (currentTotal >= MAX_FILES) {
      return {
        valid: false,
        error: `Máximo de ${MAX_FILES} fotos atingido.`,
      };
    }

    return { valid: true };
  };

  // Upload para S3 com retry automático
  const uploadImageToS3WithRetry = async (
    file: File,
    onProgress: (progress: number) => void,
    attempt: number = 1
  ): Promise<string> => {
    try {
      return await uploadImageToS3(file, onProgress);
    } catch (error) {
      if (attempt >= MAX_RETRIES) {
        throw error; // Esgotou tentativas
      }

      // Backoff exponencial: 2s, 4s, 8s
      const delay = 1000 * Math.pow(2, attempt);
      console.log(`⚠️ Tentativa ${attempt + 1}/${MAX_RETRIES} em ${delay / 1000}s...`);

      await new Promise((resolve) => setTimeout(resolve, delay));

      // Tentar novamente
      return uploadImageToS3WithRetry(file, onProgress, attempt + 1);
    }
  };

  // Upload para S3
  const uploadImageToS3 = async (
    file: File,
    onProgress: (progress: number) => void
  ): Promise<string> => {
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    
    // Adicionar property_code se disponível (external_id ou id do imóvel)
    // Isso criará pastas organizadas no S3: uploads/{tenant_id}/{property_code}/photos/
    const propertyCode = formData.external_id || (formData.id ? `PROP-${formData.id}` : null);
    if (propertyCode) {
      formDataUpload.append('property_code', propertyCode);
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Monitorar progresso
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      // Sucesso
      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result.url);
          } catch (error) {
            reject(new Error('Erro ao processar resposta do servidor'));
          }
        } else {
          reject(new Error(`Erro no upload: ${xhr.status} - ${xhr.statusText}`));
        }
      });

      // Erro
      xhr.addEventListener('error', () => {
        reject(new Error('Erro de rede ao fazer upload'));
      });

      // Timeout
      xhr.addEventListener('timeout', () => {
        reject(new Error('Timeout ao fazer upload'));
      });

      // Configurar e enviar
      const apiBaseUrl = (import.meta.env.DEV
        ? ''
        : (import.meta.env.VITE_API_URL || 'https://api.quadradois.com.br'));
      xhr.open('POST', `${apiBaseUrl}/api/properties/images/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('access_token')}`);
      xhr.timeout = 60000; // 60 segundos
      xhr.send(formDataUpload);
    });
  };

  // Processar arquivos - adiciona direto na galeria
  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validar todos os arquivos
    for (const file of fileArray) {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    // Mostrar erros de validação
    if (errors.length > 0) {
      toast.error(
        <div>
          <strong>Alguns arquivos foram rejeitados:</strong>
          <ul className="text-xs mt-1">
            {errors.slice(0, 3).map((err, i) => (
              <li key={i}>• {err}</li>
            ))}
            {errors.length > 3 && <li>• ... e mais {errors.length - 3}</li>}
          </ul>
        </div>,
        { duration: 5000 }
      );
    }

    if (validFiles.length === 0) return;

    // Otimizar imagens antes de criar previews
    toast.loading('Otimizando imagens...', { id: 'optimizing' });
    
    const optimizedFiles = await Promise.all(
      validFiles.map((file) => optimizeImage(file))
    );
    
    toast.success(
      `${optimizedFiles.length} imagem(ns) otimizada(s)!`,
      { id: 'optimizing', duration: 2000 }
    );

    // Criar previews locais e adicionar na galeria
    const newImageItems: ImagePreviewItem[] = await Promise.all(
      optimizedFiles.map(async (file) => {
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        return {
          id: `upload-${Date.now()}-${Math.random()}`,
          url: preview, // Preview local temporário
          isUploading: true,
          progress: 0,
          file,
        };
      })
    );

    // Adicionar na galeria
    setImagePreviews((prev) => [...prev, ...newImageItems]);

    // Iniciar uploads
    toast.success(`${validFiles.length} imagem(ns) adicionada(s). Iniciando upload...`);

    for (const item of newImageItems) {
      uploadSingleFile(item);
    }
  };

  // Upload de arquivo único - atualiza o item na galeria
  const uploadSingleFile = async (item: ImagePreviewItem) => {
    if (!item.file) return;

    try {
      const url = await uploadImageToS3WithRetry(item.file, (progress) => {
        // Atualizar progresso na galeria
        setImagePreviews((prev) =>
          prev.map((img) => (img.id === item.id ? { ...img, progress } : img))
        );
      });

      // Sucesso - atualizar item na galeria com URL final
      setImagePreviews((prev) =>
        prev.map((img) =>
          img.id === item.id
            ? { ...img, url, isUploading: false, progress: 100, file: undefined }
            : img
        )
      );

      // Adicionar ao formData
      updateField('image_urls', (prev: string[]) => [...(prev || []), url]);

      toast.success(`✓ ${item.file.name} enviado com sucesso!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      // Erro - marcar item na galeria
      setImagePreviews((prev) =>
        prev.map((img) =>
          img.id === item.id
            ? { ...img, isUploading: false, error: errorMessage }
            : img
        )
      );

      toast.error(`✗ Erro ao enviar ${item.file.name}: ${errorMessage}`);
    }
  };

  // Retry de upload falho
  const retryUpload = (item: ImagePreviewItem) => {
    if (!item.file) return;
    
    // Resetar estado
    setImagePreviews((prev) =>
      prev.map((img) =>
        img.id === item.id ? { ...img, isUploading: true, progress: 0, error: undefined } : img
      )
    );
    uploadSingleFile(item);
  };

  // Remover imagem da galeria
  const removeImage = (index: number) => {
    const item = imagePreviews[index];
    
    // Remover da galeria
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    
    // Se já foi uploaded, remover do formData
    if (!item.isUploading && !item.error && !item.url.startsWith('data:')) {
      const currentImageUrls = formData.image_urls || [];
      const newImageUrls = currentImageUrls.filter((url) => url !== item.url);
      updateField('image_urls', newImageUrls);
    }
  };

  // Handlers de drag & drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    console.log('🔵 DRAG ENTER - Counter:', dragCounter.current, 'Has Items:', e.dataTransfer.items?.length);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    console.log('🟡 DRAG LEAVE - Counter:', dragCounter.current);
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🟢 DRAG OVER');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    console.log('🔴 DROP EVENT - Files:', e.dataTransfer.files?.length);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      console.log('✅ Processing', files.length, 'dropped files');
      processFiles(files);
    } else {
      console.log('❌ No files in drop event');
    }
  };

  // Handler de input file
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Limpar input para permitir re-seleção do mesmo arquivo
    e.target.value = '';
  };

  const hasErrors = imagePreviews.some((img) => img.error);

  // Configurar sensores para drag & drop de reordenação
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Previne conflito com cliques
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handler para finalizar drag & drop de reordenação
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setImagePreviews((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const reorderedItems = arrayMove(items, oldIndex, newIndex);

      // Atualizar formData com nova ordem (apenas fotos completas)
      const completedUrls = reorderedItems
        .filter((item) => !item.isUploading && !item.error && !item.url.startsWith('data:'))
        .map((item) => item.url);

      updateField('image_urls', completedUrls);

      toast.success('Ordem das fotos atualizada!');
      return reorderedItems;
    });
  };

  // Definir foto como capa (mover para primeira posição)
  const setAsCover = (index: number) => {
    if (index === 0) return; // Já é capa

    setImagePreviews((items) => {
      const newItems = [...items];
      const [item] = newItems.splice(index, 1);
      newItems.unshift(item);

      // Atualizar formData com nova ordem
      const completedUrls = newItems
        .filter((item) => !item.isUploading && !item.error && !item.url.startsWith('data:'))
        .map((item) => item.url);

      updateField('image_urls', completedUrls);

      toast.success('Foto definida como capa!');
      return newItems;
    });
  };

  // Gerar variações de imagens para completar 20 fotos
  const generateImageVariation = async (
    imageUrl: string,
    variationType: 'crop' | 'mirror' | 'brightness' | 'contrast'
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // Aplicar variação baseada no tipo
        switch (variationType) {
          case 'crop':
            // Crop sutil (98% da imagem centralizado)
            const cropMargin = 0.01;
            const sourceX = img.width * cropMargin;
            const sourceY = img.height * cropMargin;
            const sourceWidth = img.width * (1 - cropMargin * 2);
            const sourceHeight = img.height * (1 - cropMargin * 2);
            ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
            break;

          case 'mirror':
            // Espelhar horizontalmente
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0);
            break;

          case 'brightness':
            // Aumentar brilho sutilmente (+3%)
            ctx.filter = 'brightness(103%)';
            ctx.drawImage(img, 0, 0);
            break;

          case 'contrast':
            // Aumentar contraste sutilmente (+2%)
            ctx.filter = 'contrast(102%)';
            ctx.drawImage(img, 0, 0);
            break;
        }

        // Converter para data URL
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  };

  // Completar com variações automáticas até 20 fotos
  const handleCompleteWith20Photos = async () => {
    const completedPhotos = imagePreviews.filter(
      (item) => !item.isUploading && !item.error
    );

    if (completedPhotos.length >= 20) {
      toast.error('Você já tem 20 ou mais fotos!');
      return;
    }

    if (completedPhotos.length === 0) {
      toast.error('Adicione pelo menos 1 foto primeiro!');
      return;
    }

    const neededPhotos = 20 - completedPhotos.length;
    
    toast.loading(`Gerando ${neededPhotos} variações automáticas...`, { id: 'generating-variations' });

    try {
      const variations: ImagePreviewItem[] = [];
      const variationTypes: Array<'crop' | 'mirror' | 'brightness' | 'contrast'> = [
        'crop',
        'mirror',
        'brightness',
        'contrast',
      ];

      // Selecionar fotos para duplicar (prioriza as primeiras - geralmente melhores)
      let photoIndex = 0;
      let variationTypeIndex = 0;

      for (let i = 0; i < neededPhotos; i++) {
        const sourcePhoto = completedPhotos[photoIndex % completedPhotos.length];
        const variationType = variationTypes[variationTypeIndex % variationTypes.length];

        try {
          const variationUrl = await generateImageVariation(sourcePhoto.url, variationType);

          variations.push({
            id: `variation-${Date.now()}-${i}-${Math.random()}`,
            url: variationUrl,
            isUploading: true,
            progress: 0,
            file: await dataUrlToFile(variationUrl, `variacao_${i + 1}.jpg`),
          });

          photoIndex++;
          variationTypeIndex++;
        } catch (error) {
          console.error('Error generating variation:', error);
        }
      }

      // Adicionar variações na galeria
      setImagePreviews((prev) => [...prev, ...variations]);

      toast.success(
        `✨ ${variations.length} variações geradas! Iniciando upload...`,
        { id: 'generating-variations' }
      );

      // Upload das variações
      for (const variation of variations) {
        uploadSingleFile(variation);
      }
    } catch (error) {
      console.error('Error in handleCompleteWith20Photos:', error);
      toast.error('Erro ao gerar variações. Tente novamente.', { id: 'generating-variations' });
    }
  };

  // Converter data URL para File object
  const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/jpeg' });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Layout Principal */}
      <div className="flex-1 space-y-6 overflow-auto">
        {/* Upload de Fotos Principais */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
            <ImageIcon className="w-5 h-5 mr-2 text-secondary" />
            Fotos do Imóvel
          </h3>

          <div className="space-y-4">
            {/* Upload Area com Drag & Drop */}
            <div
              ref={dropZoneRef}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`
                relative
                border-2 border-dashed rounded-lg p-8 transition-all
                ${isDragging 
                  ? 'border-secondary bg-secondary/10 scale-[1.02] shadow-lg' 
                  : 'border-border hover:border-secondary/50'
                }
                ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
              `}
              style={{ minHeight: '200px' }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                onChange={handleFileInput}
                className="hidden"
                id="image-upload"
                disabled={isUploading}
                aria-label="Upload de imagens do imóvel"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className={`
                  w-16 h-16 rounded-full flex items-center justify-center transition-colors
                  ${isDragging ? 'bg-secondary/20' : 'bg-secondary/10'}
                `}>
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 text-secondary animate-spin" />
                  ) : (
                    <Upload className={`w-8 h-8 transition-colors ${isDragging ? 'text-secondary' : 'text-secondary'}`} />
                  )}
                </div>
                <div className="text-center">
                  <p className={`text-lg font-medium mb-1 transition-colors ${
                    isDragging 
                      ? 'text-secondary' 
                      : 'text-text-primary'
                  }`}>
                    {isDragging
                      ? '📂 Solte as imagens aqui'
                      : isUploading
                        ? 'Enviando fotos...'
                        : 'Clique para adicionar fotos'}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {isUploading
                      ? 'Aguarde o upload das imagens'
                      : isDragging
                        ? 'Solte para fazer upload'
                        : 'ou arraste e solte aqui'}
                  </p>
                  <p className="text-xs text-text-secondary mt-2">
                    JPG, PNG, WEBP até 10MB cada • Máximo {MAX_FILES} fotos • Mínimo recomendado: 5
                  </p>
                </div>
              </label>
            </div>

            {/* Galeria Unificada com Progresso Inline e Reordenação */}
            {imagePreviews.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-text-primary">
                    Fotos Adicionadas ({imagePreviews.length})
                  </h4>
                  <p className="text-xs text-text-secondary flex items-center gap-2">
                    <GripVertical className="w-3 h-3" />
                    {imagePreviews.length === 1
                      ? 'Primeira foto será a capa'
                      : 'Arraste para reordenar • Primeira foto é a capa'}
                  </p>
                </div>

                {/* Alerta: Completar 20 Fotos para Máxima Relevância */}
                {imagePreviews.filter((img) => !img.isUploading && !img.error).length < 20 && 
                 imagePreviews.filter((img) => !img.isUploading && !img.error).length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1 text-sm">
                          ⚠️ Apenas {imagePreviews.filter((img) => !img.isUploading && !img.error).length} fotos 
                          ({20 - imagePreviews.filter((img) => !img.isUploading && !img.error).length} para atingir o ideal)
                        </h4>
                        <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-3">
                          <strong>CanalPro prioriza anúncios com 20+ fotos.</strong> Imóveis com menos fotos têm menor relevância e visibilidade nas buscas.
                        </p>
                        
                        <button
                          onClick={handleCompleteWith20Photos}
                          disabled={isUploading}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <Sparkles className="w-4 h-4" />
                          Completar com 20 Fotos Automaticamente
                          <span className="text-xs opacity-90">
                            (+{20 - imagePreviews.filter((img) => !img.isUploading && !img.error).length} variações)
                          </span>
                        </button>
                        
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2 italic">
                          💡 Geraremos variações sutis das suas fotos (crops, ajustes, perspectivas) para completar 20 fotos únicas.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={imagePreviews.map((item) => item.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {imagePreviews.map((item, index) => (
                        <SortablePhotoItem
                          key={item.id}
                          item={item}
                          index={index}
                          isCover={index === 0}
                          onRemove={removeImage}
                          onSetAsCover={setAsCover}
                          onRetry={retryUpload}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Alerta de Erros */}
                {hasErrors && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Alguns uploads falharam
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                        Clique em "Tentar novamente" nas imagens com erro
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Status de fotos */}
            <div
              className={`text-center py-3 px-4 rounded-lg ${
                imagePreviews.length === 0
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                  : imagePreviews.length < 5
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                    : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              }`}
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-medium">
                {imagePreviews.length === 0 && '⚠️ Nenhuma foto adicionada'}
                {imagePreviews.length > 0 &&
                  imagePreviews.length < 5 &&
                  `📷 ${imagePreviews.length} fotos adicionadas - Recomendamos pelo menos 5 fotos`}
                {imagePreviews.length >= 5 &&
                  `✅ ${imagePreviews.length} fotos adicionadas - Ótimo!`}
              </p>
            </div>
          </div>
        </div>

        {/* Mídia Adicional */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
            <Video className="w-5 h-5 mr-2 text-primary" />
            Mídia Adicional
          </h3>

          <div className="space-y-4">
            {/* Vídeo */}
            <div>
              <label htmlFor="video-link" className="block text-sm font-medium text-text-primary mb-2">
                🎥 Link do Vídeo (YouTube, Vimeo)
              </label>
              <input
                id="video-link"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={formData.videos || ''}
                onChange={(e) => updateField('videos', e.target.value)}
                className="w-full px-4 py-3 border border-border bg-background text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                aria-describedby="video-help"
              />
              <p id="video-help" className="text-xs text-text-secondary mt-1">
                Vídeos aumentam em 40% o interesse dos compradores
              </p>
              {!(formData.videos && typeof formData.videos === 'string' && formData.videos.trim()) && (
                <p className="text-xs text-primary mt-1 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Se não preencher, será usado um vídeo padrão automaticamente
                </p>
              )}
            </div>

            {/* Tour Virtual */}
            <div>
              <label htmlFor="tour-link" className="block text-sm font-medium text-text-primary mb-2">
                🌐 Tour Virtual 360° (Matterport, etc.)
              </label>
              <input
                id="tour-link"
                type="url"
                placeholder="https://matterport.com/..."
                value={formData.virtual_tour_link || ''}
                onChange={(e) => updateField('virtual_tour_link', e.target.value)}
                className="w-full px-4 py-3 border border-border bg-background text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                aria-describedby="tour-help"
              />
              <p id="tour-help" className="text-xs text-text-secondary mt-1">
                Tours virtuais reduzem visitas desnecessárias
              </p>
            </div>

            {/* Plantas e Documentos */}
            <div>
              <label htmlFor="docs-upload" className="block text-sm font-medium text-text-primary mb-2">
                📋 Planta Baixa / Documentos (Opcional)
              </label>
              <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  id="docs-upload"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    updateField('documents', files);
                  }}
                  aria-label="Upload de plantas ou documentos"
                />
                <label
                  htmlFor="docs-upload"
                  className="cursor-pointer flex items-center justify-center space-x-2 text-sm"
                >
                  <Upload className="w-4 h-4 text-text-secondary" />
                  <span className="text-text-primary">
                    Adicionar plantas ou documentos
                  </span>
                </label>
                <p className="text-xs text-text-secondary text-center mt-1">
                  PDF, JPG, PNG até 5MB cada
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview da Galeria - migrado para o sidebar direito */}
      </div>
    </div>
  );
};

export default Step5Photos;
