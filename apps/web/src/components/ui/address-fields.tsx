import type { FieldErrors, Path, UseFormRegister } from 'react-hook-form';
import type { FieldValues } from 'react-hook-form';
import { IZMIR_DISTRICTS, SERVICED_DISTRICTS } from '@ersinspot/shared';
import { findError } from '@/lib/form.ts';
import { SelectField, TextField } from './form-field.tsx';

/**
 * Adres alanları.
 *
 * Sipariş, nakliye, teknik servis ve satış talebinde aynı alanlar kullanılır;
 * bir kez yazılıp her yerde kullanılır. Eski kod tabanında adres formu her
 * sayfada yeniden yazılmıştı ve alan adları tutarsızdı.
 *
 * @param prefix Alan yolunun ön eki: "delivery.address" gibi iç içe formlarda
 *   kullanılır. Boş bırakılırsa alanlar kök seviyededir.
 * @param servicedOnly Yalnızca hizmet verilen ilçeleri listeler. Nakliye ve
 *   teknik serviste böyle; ürün teslimatında tüm ilçeler seçilebilir.
 */
export interface AddressFieldsProps<TValues extends FieldValues> {
  register: UseFormRegister<TValues>;
  errors: FieldErrors<TValues>;
  prefix?: string;
  servicedOnly?: boolean;
  legend?: string;
}

export function AddressFields<TValues extends FieldValues>({
  register,
  errors,
  prefix = '',
  servicedOnly = false,
  legend = 'Adres',
}: AddressFieldsProps<TValues>) {
  const field = (name: string): Path<TValues> =>
    (prefix === '' ? name : `${prefix}.${name}`) as Path<TValues>;

  const errorOf = (name: string): string | undefined =>
    findError(errors, prefix === '' ? name : `${prefix}.${name}`);

  const districts = servicedOnly ? SERVICED_DISTRICTS : IZMIR_DISTRICTS;

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-slate-900">{legend}</legend>

      <SelectField
        label="İlçe"
        required
        error={errorOf('district')}
        hint={
          servicedOnly
            ? 'Listede olmayan ilçelerde henüz hizmet vermiyoruz.'
            : undefined
        }
        {...register(field('district'))}
      >
        <option value="">Seçiniz</option>
        {districts.map((district) => (
          <option key={district} value={district}>
            {district}
          </option>
        ))}
      </SelectField>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Mahalle"
          required
          autoComplete="address-level3"
          error={errorOf('neighborhood')}
          {...register(field('neighborhood'))}
        />

        <TextField
          label="Sokak / Cadde"
          required
          autoComplete="address-line1"
          error={errorOf('street')}
          {...register(field('street'))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Bina No"
          required
          error={errorOf('buildingNo')}
          {...register(field('buildingNo'))}
        />

        <TextField
          label="Daire No"
          hint="Müstakil evlerde boş bırakabilirsiniz."
          error={errorOf('apartmentNo')}
          {...register(field('apartmentNo'))}
        />
      </div>

      <TextField
        label="Adres Tarifi"
        hint="Kuryenin sizi kolay bulması için: “market karşısı, yeşil kapı” gibi."
        error={errorOf('directions')}
        {...register(field('directions'))}
      />
    </fieldset>
  );
}
