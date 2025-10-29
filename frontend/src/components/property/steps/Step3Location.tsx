import React, { useState } from 'react';
import { usePropertyCreate } from '@/contexts/PropertyCreateContext';
import { MapPin, Search } from 'lucide-react';

const Step3Location: React.FC = () => {
  const { formData, updateField } = usePropertyCreate();
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const buildAddressQuery = () => {
    const parts = [
      formData.endereco,
      formData.numero,
      formData.bairro,
      formData.cidade,
      formData.estado,
      formData.cep,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const normalizeCep = (cep?: string) => (cep || '').replace(/\D/g, '').slice(0, 8);

  const geocodeAddress = async () => {
    const q = buildAddressQuery();
    if (!q) return;
    setGeocodeError(null);
    setIsGeocoding(true);

    const cep = normalizeCep(formData.cep);
    const streetWithNumber = [formData.endereco, formData.numero].filter(Boolean).join(' ');

    const attempts: string[] = [
      // 1) Consulta estruturada completa
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&street=${encodeURIComponent(streetWithNumber)}&city=${encodeURIComponent(formData.cidade || '')}&state=${encodeURIComponent(formData.estado || '')}&country=${encodeURIComponent('Brazil')}&postalcode=${encodeURIComponent(cep)}`,
      // 2) Consulta por string com país
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&countrycodes=br&q=${encodeURIComponent(q + ', Brazil')}`,
      // 3) Consulta por CEP
      cep
        ? `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&countrycodes=br&postalcode=${encodeURIComponent(cep)}`
        : '',
      // 4) Consulta sem número (às vezes funciona melhor)
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&street=${encodeURIComponent(formData.endereco || '')}&city=${encodeURIComponent(formData.cidade || '')}&state=${encodeURIComponent(formData.estado || '')}&country=${encodeURIComponent('Brazil')}`,
    ].filter(Boolean);

    try {
      let resultOk: any = null;
      for (const url of attempts) {
        const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          resultOk = results[0];
          break;
        }
      }

      if (resultOk) {
        const { lat, lon } = resultOk;
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        updateField('latitude', latNum);
        updateField('longitude', lonNum);
        updateField('display_latitude', latNum);
        updateField('display_longitude', lonNum);
      } else {
        setGeocodeError('Não foi possível localizar coordenadas para este endereço. Tente ajustar o endereço ou remover o número.');
      }
    } catch (err) {
      console.error('Erro ao geocodificar endereço:', err);
      setGeocodeError('Erro ao buscar coordenadas.');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Debounce simples para evitar múltiplas chamadas consecutivas
  let geocodeTimeout: number | undefined;
  const autoGeocodeIfReady = () => {
    const hasBasic = !!formData.endereco && !!formData.cidade && !!formData.estado;
    if (!hasBasic) return;
    if (geocodeTimeout) window.clearTimeout(geocodeTimeout);
    geocodeTimeout = window.setTimeout(() => geocodeAddress(), 600);
  };

  const handleCepChange = async (cep: string) => {
    updateField('cep', cep);

    // Remove caracteres não numéricos
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length === 8) {
      setIsSearchingCep(true);
      try {
        const response = await fetch(
          `https://viacep.com.br/ws/${cleanCep}/json/`
        );
        const data = await response.json();

        if (!data.erro) {
          updateField('endereco', data.logradouro || '');
          updateField('bairro', data.bairro || '');
          updateField('cidade', data.localidade || '');
          updateField('estado', data.uf || '');
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      } finally {
        setIsSearchingCep(false);
        autoGeocodeIfReady();
      }
    }
  };

  const formatCep = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Layout Principal: Formulário + Mapa */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Coluna Esquerda - Formulário */}
        <div className="space-y-4">
          {/* CEP com busca automática */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center">
              <Search className="w-4 h-4 mr-2 text-primary" />
              Endereço Completo
            </h3>

            <div className="space-y-3">
              {/* CEP e Número na mesma linha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    CEP *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="00000-000"
                      value={formatCep(formData.cep || '')}
                      onChange={e => handleCepChange(e.target.value)}
                      maxLength={9}
                      className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    {isSearchingCep && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Número *
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    value={formData.numero || ''}
                    onChange={e => updateField('numero', e.target.value)}
                    onBlur={() => autoGeocodeIfReady()}
                    className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Endereço - linha completa */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Endereço *
                </label>
                <input
                  type="text"
                  placeholder="Rua, Avenida, etc."
                  value={formData.endereco || ''}
                  onChange={e => updateField('endereco', e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Complemento e Bairro na mesma linha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    placeholder="Apto, Bloco, etc."
                    value={formData.complemento || ''}
                    onChange={e => updateField('complemento', e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Bairro *
                  </label>
                  <input
                    type="text"
                    placeholder="Bairro"
                    value={formData.bairro || ''}
                    onChange={e => updateField('bairro', e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Cidade e Estado na mesma linha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    placeholder="Cidade"
                    value={formData.cidade || ''}
                    onChange={e => updateField('cidade', e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Estado *
                  </label>
                  <select
                    value={formData.estado || ''}
                    onChange={e => updateField('estado', e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Selecione</option>
                    <option value="AC">Acre</option>
                    <option value="AL">Alagoas</option>
                    <option value="AP">Amapá</option>
                    <option value="AM">Amazonas</option>
                    <option value="BA">Bahia</option>
                    <option value="CE">Ceará</option>
                    <option value="DF">Distrito Federal</option>
                    <option value="ES">Espírito Santo</option>
                    <option value="GO">Goiás</option>
                    <option value="MA">Maranhão</option>
                    <option value="MT">Mato Grosso</option>
                    <option value="MS">Mato Grosso do Sul</option>
                    <option value="MG">Minas Gerais</option>
                    <option value="PA">Pará</option>
                    <option value="PB">Paraíba</option>
                    <option value="PR">Paraná</option>
                    <option value="PE">Pernambuco</option>
                    <option value="PI">Piauí</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="RN">Rio Grande do Norte</option>
                    <option value="RS">Rio Grande do Sul</option>
                    <option value="RO">Rondônia</option>
                    <option value="RR">Roraima</option>
                    <option value="SC">Santa Catarina</option>
                    <option value="SP">São Paulo</option>
                    <option value="SE">Sergipe</option>
                    <option value="TO">Tocantins</option>
                  </select>
                </div>
              </div>

              {/* Campos obrigatórios */}
              <div className="mt-3 text-center">
                <p className="text-xs text-text-secondary">
                  * Campos obrigatórios
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita - Mapa */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-primary" />
            Visualização no Mapa
          </h3>

          {/* Coordenadas e Geocodificação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Latitude</label>
              <input
                type="number"
                placeholder="-23.5"
                value={formData.latitude ?? ''}
                onChange={e => {
                  const v = e.target.value;
                  updateField('latitude', v === '' ? undefined : parseFloat(v));
                }}
                className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Longitude</label>
              <input
                type="number"
                placeholder="-46.6"
                value={formData.longitude ?? ''}
                onChange={e => {
                  const v = e.target.value;
                  updateField('longitude', v === '' ? undefined : parseFloat(v));
                }}
                className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Ações</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={geocodeAddress}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Search className="w-4 h-4" /> Buscar coordenadas
                </button>
                {isGeocoding && (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              {geocodeError && (
                <p className="text-xs text-danger mt-1">{geocodeError}</p>
              )}
            </div>
          </div>

          {/* Container do Mapa */}
          <div
            className="relative bg-background border border-border rounded-lg overflow-hidden"
            style={{ minHeight: '300px' }}
          >
            {/* Placeholder do Mapa */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-text-secondary mb-2">
                  {formData.endereco && formData.cidade
                    ? 'Mapa será carregado aqui'
                    : 'Preencha o endereço para visualizar no mapa'}
                </p>
                {formData.endereco && formData.cidade && (
                  <p className="text-xs text-text-secondary/70 max-w-sm">
                    {formData.endereco},{' '}
                    {formData.numero && `${formData.numero}, `}
                    {formData.bairro}, {formData.cidade} - {formData.estado}
                  </p>
                )}
              </div>
            </div>

            {/* Aqui será integrado o componente do mapa no futuro */}
            {/* <GoogleMap /> ou <LeafletMap /> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step3Location;
