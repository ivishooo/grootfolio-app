/**
 * Mensajes de validacion de Vine en castellano (GF-215). Provider global: lo
 * usan todos los validators (auth, transactions, etc.). Se pueden sobrescribir
 * por campo con la forma `campo.regla`.
 */
import vine, { SimpleMessagesProvider } from '@vinejs/vine'

vine.messagesProvider = new SimpleMessagesProvider({
  // reglas genericas
  required: 'El campo {{ field }} es obligatorio.',
  string: 'El campo {{ field }} debe ser texto.',
  number: 'El campo {{ field }} debe ser numerico.',
  boolean: 'El campo {{ field }} debe ser verdadero o falso.',
  email: 'El email no tiene un formato valido.',
  enum: 'El valor de {{ field }} no es valido.',
  minLength: 'El campo {{ field }} debe tener al menos {{ min }} caracteres.',
  maxLength: 'El campo {{ field }} no puede superar los {{ max }} caracteres.',
  min: 'El valor de {{ field }} es demasiado bajo.',
  max: 'El valor de {{ field }} es demasiado alto.',
  positive: 'El campo {{ field }} debe ser mayor a cero.',
  regex: 'El campo {{ field }} tiene un formato invalido.',

  // overrides por campo
  'password.minLength': 'La contrasena debe tener al menos {{ min }} caracteres.',
  'quantity.positive': 'La cantidad debe ser mayor a cero.',
  'unitPrice.min': 'El precio unitario no puede ser negativo.',
  'fee.min': 'La comision no puede ser negativa.',
  'slug.regex': 'El slug solo admite minusculas, numeros y guiones.',
})
