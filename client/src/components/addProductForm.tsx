import { useState } from "react";
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    // IMPORTANTE: Como aún no tenemos selector de categorías,
    // enviamos el ID 1 por defecto (asegúrate de tener una categoría en tu DB)
    if (!formData.get("category_id")) {
      formData.append("category_id", "1");
    }

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
        <Button className="bg-slate-900 text-white hover:bg-slate-800">
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
            <Label htmlFor="image">Foto del producto</Label>
            <Input 
              id="image" 
              name="image" 
              type="file" 
              accept="image/*" 
              className="cursor-pointer" 
              required 
            />
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
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