// src/components/payment-methods/PaymentMethodManagement.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import DashboardLayout from '@/features/dashboard/components/DashboardLayout';
import { CreditCard, Building, Info, X, CheckCircle, Pencil, Trash, Plus } from 'lucide-react';
import { 
  getUserPaymentMethods, 
  createPaymentMethod, 
  updatePaymentMethod, 
  deletePaymentMethod, 
  togglePaymentMethodStatus,
  PaymentMethod
} from '@/features/payment-method/services/payment-method-service';

// Importar componentes de UI
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

export default function PaymentMethodManagement() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  // Estado del formulario
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    bank: '',
    details: '',
    is_active: true
  });
  
  // Cargar métodos de pago al montar el componente
  useEffect(() => {
    if (user?.id) {
      loadPaymentMethods();
    }
  }, [user]);
  
  const loadPaymentMethods = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getUserPaymentMethods(user!.id);
      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (err: any) {
      toast({
        description: `Error al cargar métodos de pago: ${err.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) return;
    
    try {
      if (editingId) {
        // Actualizar método de pago existente
        const { error } = await updatePaymentMethod(editingId, formData);
        if (error) throw error;
        
        toast({
          description: "Método de pago actualizado con éxito"
        });
      } else {
        // Crear nuevo método de pago
        const { error } = await createPaymentMethod({
          user_id: user.id,
          ...formData
        });
        if (error) throw error;
        
        toast({
          description: "Método de pago creado con éxito"
        });
      }
      
      // Resetear formulario y recargar datos
      resetForm();
      loadPaymentMethods();
    } catch (err: any) {
      toast({
        description: `Error: ${err.message}`,
        variant: "destructive"
      });
    }
  };
  
  const handleDelete = async (id: string) => {
    try {
      const { error } = await deletePaymentMethod(id);
      if (error) throw error;
      
      setPaymentMethods(methods => methods.filter(m => m.id !== id));
      toast({
        description: "Método de pago eliminado con éxito"
      });
    } catch (err: any) {
      toast({
        description: `Error al eliminar: ${err.message}`,
        variant: "destructive"
      });
    }
  };
  
  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      const { data, error } = await togglePaymentMethodStatus(id, isActive);
      if (error) throw error;
      
      setPaymentMethods(methods => 
        methods.map(m => m.id === id ? {...m, is_active: isActive} : m)
      );
      
      toast({
        description: `Método de pago ${isActive ? 'activado' : 'desactivado'} con éxito`
      });
    } catch (err: any) {
      toast({
        description: `Error al cambiar estado: ${err.message}`,
        variant: "destructive"
      });
    }
  };
  
  const startEdit = (method: PaymentMethod) => {
    setFormData({
      name: method.name,
      bank: method.bank || '',
      details: method.details || '',
      is_active: method.is_active || true
    });
    setEditingId(method.id);
    setIsFormOpen(true);
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      bank: '',
      details: '',
      is_active: true
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  // Filtrar métodos de pago según la pestaña activa
  const getFilteredMethods = () => {
    switch (activeTab) {
      case 'active':
        return paymentMethods.filter(m => m.is_active);
      case 'inactive':
        return paymentMethods.filter(m => !m.is_active);
      default:
        return paymentMethods;
    }
  };
  
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              Métodos de Pago
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Administra tus métodos de pago para un registro más rápido de transacciones
            </p>
          </div>
          
          {!isFormOpen && (
            <Button 
              onClick={() => setIsFormOpen(true)}
              className="mt-4 md:mt-0"
            >
              <Plus className="mr-2 h-4 w-4" /> Nuevo Método de Pago
            </Button>
          )}
        </div>
        
        {/* Formulario para añadir/editar métodos de pago */}
        {isFormOpen && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingId ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
              </CardTitle>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="name" className="text-sm font-medium">
                    Nombre *
                  </label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Efectivo, Tarjeta Visa, etc."
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="bank" className="text-sm font-medium">
                    Entidad/Banco (opcional)
                  </label>
                  <Input
                    id="bank"
                    value={formData.bank}
                    onChange={(e) => setFormData({...formData, bank: e.target.value})}
                    placeholder="Banco XYZ"
                  />
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="details" className="text-sm font-medium">
                    Detalles (opcional)
                  </label>
                  <Textarea
                    id="details"
                    value={formData.details}
                    onChange={(e) => setFormData({...formData, details: e.target.value})}
                    placeholder="Detalles adicionales del método de pago"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <label htmlFor="is_active" className="text-sm font-medium">
                    ¿Método de pago activo?
                  </label>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? 'Actualizar' : 'Guardar'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
        
        {/* Lista de métodos de pago */}
        <Tabs defaultValue="all" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="inactive">Inactivos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            {isLoading ? (
              <div className="p-10 text-center">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-gray-500 dark:text-gray-400">Cargando métodos de pago...</p>
              </div>
            ) : getFilteredMethods().length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <CreditCard size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 mb-2">
                    {activeTab === 'all' 
                      ? 'No tienes métodos de pago guardados' 
                      : activeTab === 'active' 
                        ? 'No tienes métodos de pago activos'
                        : 'No tienes métodos de pago inactivos'
                    }
                  </p>
                  {activeTab === 'all' && (
                    <Button
                      onClick={() => setIsFormOpen(true)}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Añadir tu primer método de pago
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {getFilteredMethods().map((method) => (
                  <Card key={method.id} className={!method.is_active ? 'opacity-60' : ''}>
<CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-4">
                            <CreditCard className="text-blue-600 dark:text-blue-400" size={20} />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{method.name}</h3>
                            {method.bank && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                <Building size={14} className="mr-1" /> {method.bank}
                              </p>
                            )}
                            {method.details && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                <Info size={14} className="mr-1" /> {method.details}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2 mr-4">
                            <Switch 
                              id={`status-${method.id}`}
                              checked={!!method.is_active} 
                              onCheckedChange={(checked) => handleToggleStatus(method.id, checked)}
                            />
                            <label 
                              htmlFor={`status-${method.id}`}
                              className="text-sm text-gray-500 dark:text-gray-400"
                            >
                              {method.is_active ? 'Activo' : 'Inactivo'}
                            </label>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(method)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar método de pago?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas eliminar el método de pago "{method.name}"? Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(method.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="active">
            {getFilteredMethods().length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No hay métodos de pago activos
              </div>
            ) : (
              <div className="grid gap-4">
                {getFilteredMethods().map((method) => (
                  // El contenido sería el mismo que arriba, pero repetido para esta pestaña.
                  // Para evitar duplicación, podríamos refactorizar esto en un componente separado.
                  <Card key={method.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-4">
                            <CreditCard className="text-blue-600 dark:text-blue-400" size={20} />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{method.name}</h3>
                            {method.bank && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                <Building size={14} className="mr-1" /> {method.bank}
                              </p>
                            )}
                            {method.details && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                <Info size={14} className="mr-1" /> {method.details}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2 mr-4">
                            <Switch 
                              id={`status-active-${method.id}`}
                              checked={!!method.is_active} 
                              onCheckedChange={(checked) => handleToggleStatus(method.id, checked)}
                            />
                            <label 
                              htmlFor={`status-active-${method.id}`}
                              className="text-sm text-gray-500 dark:text-gray-400"
                            >
                              Activo
                            </label>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(method)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar método de pago?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas eliminar el método de pago "{method.name}"? Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(method.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="inactive">
            {getFilteredMethods().length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No hay métodos de pago inactivos
              </div>
            ) : (
              <div className="grid gap-4">
                {getFilteredMethods().map((method) => (
                  <Card key={method.id} className="opacity-60">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-4">
                            <CreditCard className="text-blue-600 dark:text-blue-400" size={20} />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{method.name}</h3>
                            {method.bank && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                <Building size={14} className="mr-1" /> {method.bank}
                              </p>
                            )}
                            {method.details && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                <Info size={14} className="mr-1" /> {method.details}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2 mr-4">
                            <Switch 
                              id={`status-inactive-${method.id}`}
                              checked={!!method.is_active} 
                              onCheckedChange={(checked) => handleToggleStatus(method.id, checked)}
                            />
                            <label 
                              htmlFor={`status-inactive-${method.id}`}
                              className="text-sm text-gray-500 dark:text-gray-400"
                            >
                              Inactivo
                            </label>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(method)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar método de pago?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas eliminar el método de pago "{method.name}"? Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(method.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}