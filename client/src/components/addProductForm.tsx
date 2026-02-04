import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { PlusCircle, Loader2 } from "lucide-react";

interface AddProductFormProps {
  onProductAdded: () => void;
}

export function AddProductForm({ onProductAdded }: AddProductFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        setCategoriesError(null);
        const response = await api.get("/categories");
        if (isMounted) {
          setCategories(response.data || []);
        }
      } catch (error) {
        console.error("Error al cargar categorías:", error);
        if (isMounted) {
          setCategoriesError("No se pudieron cargar las categorías");
          setCategories([]);
        }
      } finally {
        if (isMounted) {
          setCategoriesLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const imagesInput = e.currentTarget.elements.namedItem("images") as HTMLInputElement | null;
    const imageFiles = imagesInput?.files;
    if (!imageFiles || imageFiles.length === 0) {
      alert("Debes subir al menos 1 imagen.");
      setLoading(false);
      return;
    }
    if (imageFiles.length > 4) {
      alert("Puedes subir máximo 4 imágenes.");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    
    // El selector es obligatorio; no forzamos categoría por defecto

    try {
      // Enviamos el FormData directamente (Axios detecta que lleva un archivo)
      await api.post("/products", formData);
      
      setOpen(false); // Cerramos el modal
      onProductAdded(); // Refrescamos la lista de la página principal
      
      // Limpiamos el formulario (opcional si el modal se destruye)
      (e.target as HTMLFormElement).reset();
      
    } catch (error) {
      console.error("Error al crear producto:", error);
      alert("Hubo un error al guardar. Revisa que el servidor esté encendido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10 bg-slate-900 text-white hover:bg-slate-800">
          <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Producto
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Añadir a la Vitrina</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nombre del producto</Label>
            <Input id="title" name="title" placeholder="Ej: Camiseta Minimal" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Precio (USD)</Label>
            <Input id="price" name="price" type="number" step="0.01" placeholder="0.00" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea 
              id="description" 
              name="description" 
              placeholder="Cuenta un poco más sobre este artículo..." 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label>Categoría</Label>
            <select 
              name="category_id" 
              defaultValue=""
              className="w-full p-2 border rounded-md bg-white text-sm"
              required
              disabled={categoriesLoading || !!categoriesError}
            >
              <option value="" disabled>
                {categoriesLoading
                  ? "Cargando categorías..."
                  : categoriesError
                  ? "No se pudieron cargar"
                  : "Selecciona una categoría"}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {categoriesError ? (
              <p className="text-xs text-red-600">{categoriesError}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="images">Fotos del producto (1 a 4)</Label>
            <Input 
              id="images" 
              name="images" 
              type="file" 
              accept="image/*" 
              className="cursor-pointer" 
              multiple
              required 
            />
            <p className="text-xs text-slate-500">La primera imagen será la principal.</p>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading || categoriesLoading || !!categoriesError || categories.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo a la nube...
              </>
            ) : (
              "Publicar Producto"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}