import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { insertPropertySchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

const formSchema = insertPropertySchema.extend({
  amenities: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PropertyFormProps {
  isVisible: boolean;
  onClose: () => void;
}

export function PropertyForm({ isVisible, onClose }: PropertyFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      propertyType: "",
      state: "",
      city: "",
      neighborhood: "",
      address: "",
      zipCode: "",
      bedrooms: 0,
      bathrooms: 0,
      parkingSpaces: 0,
      area: 0,
      price: "0",
      condoFee: "0",
      iptu: "0",
      businessType: "",
      amenities: [],
      mainImage: "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
    },
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/properties", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Imóvel cadastrado com sucesso e adicionado ao banco de dados vetorial.",
      });
      form.reset();
      onClose();
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao cadastrar imóvel: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createPropertyMutation.mutate(data);
  };

  const amenitiesOptions = [
    { id: "piscina", label: "Piscina" },
    { id: "academia", label: "Academia" },
    { id: "churrasqueira", label: "Churrasqueira" },
    { id: "elevador", label: "Elevador" },
    { id: "portaria", label: "Portaria 24h" },
    { id: "jardim", label: "Jardim" },
  ];

  if (!isVisible) return null;

  return (
    <div className="bg-card rounded-xl border border-border shadow-lg" data-testid="property-form">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-card-foreground truncate">Cadastrar Imóvel</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Adicione um novo imóvel ao banco de dados</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="ml-2 flex-shrink-0"
            data-testid="close-form-button"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 sm:p-6 max-h-[500px] sm:max-h-[600px] overflow-y-auto chat-scroll">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="property-registration-form">
            {/* Basic Information */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-medium text-card-foreground border-b border-border pb-2">
                Informações Básicas
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título do Imóvel</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Ex: Apartamento em Copacabana"
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="propertyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Imóvel</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-property-type">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="apartamento">Apartamento</SelectItem>
                          <SelectItem value="casa">Casa</SelectItem>
                          <SelectItem value="cobertura">Cobertura</SelectItem>
                          <SelectItem value="sobrado">Sobrado</SelectItem>
                          <SelectItem value="studio">Studio</SelectItem>
                          <SelectItem value="loft">Loft</SelectItem>
                          <SelectItem value="terreno">Terreno</SelectItem>
                          <SelectItem value="comercial">Comercial</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value ?? ""}
                        rows={3}
                        placeholder="Descreva as características principais do imóvel..."
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-card-foreground border-b border-border pb-2">
                Localização
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-state">
                            <SelectValue placeholder="Selecione o estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SP">São Paulo</SelectItem>
                          <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                          <SelectItem value="MG">Minas Gerais</SelectItem>
                          <SelectItem value="PR">Paraná</SelectItem>
                          <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Ex: São Paulo"
                          data-testid="input-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Ex: Vila Madalena"
                          data-testid="input-neighborhood"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value ?? ""}
                          placeholder="00000-000"
                          data-testid="input-zipcode"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço Completo</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value ?? ""}
                        placeholder="Rua, número, complemento"
                        data-testid="input-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Property Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-card-foreground border-b border-border pb-2">
                Características
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quartos</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value ?? 0}
                          type="number" 
                          min="0"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-bedrooms"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banheiros</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value ?? 0}
                          type="number" 
                          min="0"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-bathrooms"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parkingSpaces"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vagas</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value ?? 0}
                          type="number" 
                          min="0"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-parking"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área (m²)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value ?? 0}
                          type="number" 
                          min="0"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-area"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Financial Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-card-foreground border-b border-border pb-2">
                Informações Financeiras
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="0"
                          placeholder="Ex: 500000"
                          data-testid="input-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Negócio</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-business-type">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="venda">Venda</SelectItem>
                          <SelectItem value="aluguel">Aluguel</SelectItem>
                          <SelectItem value="ambos">Venda/Aluguel</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="condoFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condomínio (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value ?? ""}
                          type="number" 
                          min="0"
                          placeholder="Ex: 400"
                          data-testid="input-condo-fee"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="iptu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IPTU (R$/ano)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value ?? ""}
                          type="number" 
                          min="0"
                          placeholder="Ex: 2400"
                          data-testid="input-iptu"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Amenities */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-card-foreground border-b border-border pb-2">
                Comodidades
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {amenitiesOptions.map((amenity) => (
                  <FormField
                    key={amenity.id}
                    control={form.control}
                    name="amenities"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(amenity.id)}
                            onCheckedChange={(checked) => {
                              const currentValue = field.value || [];
                              if (checked) {
                                field.onChange([...currentValue, amenity.id]);
                              } else {
                                field.onChange(currentValue.filter((value) => value !== amenity.id));
                              }
                            }}
                            data-testid={`checkbox-${amenity.id}`}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          {amenity.label}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-card-foreground border-b border-border pb-2">
                Imagens
              </h3>
              
              <FormField
                control={form.control}
                name="mainImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Imagem Principal</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value ?? ""}
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        data-testid="input-main-image"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-card-foreground border-b border-border pb-2">
                Informações de Contato
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Responsável</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value ?? ""}
                          placeholder="Nome completo"
                          data-testid="input-contact-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value ?? ""}
                          type="tel"
                          placeholder="(11) 99999-9999"
                          data-testid="input-contact-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value ?? ""}
                        type="email"
                        placeholder="email@exemplo.com"
                        data-testid="input-contact-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-border">
              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                disabled={createPropertyMutation.isPending}
                data-testid="submit-property-button"
              >
                <Save className="w-4 h-4 mr-2" />
                {createPropertyMutation.isPending ? "Cadastrando..." : "Cadastrar Imóvel"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
