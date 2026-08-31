/**
 * Seeder de la biblioteca de Contenidos.
 *
 * Hasta ahora ningún seeder creaba ni secciones ni items: las 4 secciones se
 * habían cargado a mano y los únicos items de la base eran fixtures que dejaba
 * la suite E2E (`E2E Guía <timestamp>`). Al limpiarlos, la pantalla quedó
 * vacía. Este seeder la deja con material real.
 *
 * **Todos los enlaces son a fuentes primarias** — CNV, BCRA, BYMA y ARCA — y
 * cada URL se verificó que respondiera 200 antes de escribirla acá. La
 * biblioteca no da consejos de inversión: enlaza a los organismos que regulan
 * el mercado y a la documentación impositiva oficial. Si alguno se cae con el
 * tiempo, se corrige acá y `db:seed` lo actualiza.
 *
 * El prefijo `y_` es para el orden alfabético de ejecución: necesita que los
 * usuarios ya existan para poder atribuir los contenidos a un admin (mismo
 * motivo por el que existe `z_admin_seeder`).
 *
 * Idempotente por partes: las secciones por `slug` (que tiene unique) y los
 * items por `external_url`. Re-correr `db:seed` actualiza título, descripción y
 * sección, pero **no** pisa `published_at`, para no volver a marcar como nuevo
 * algo que los usuarios ya vieron.
 */
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import ContentSection from '#models/content_section'
import ContentItem from '#models/content_item'
import User from '#models/user'

interface SeccionSeed {
  slug: string
  name: string
  icon: string
  color: string
  position: number
}

interface ItemSeed {
  seccion: string
  title: string
  description: string
  externalUrl: string
  pinned?: boolean
}

const SECCIONES: SeccionSeed[] = [
  { slug: 'primeros-pasos', name: 'Primeros pasos', icon: '🚀', color: '#F97316', position: 0 },
  { slug: 'cripto', name: 'Cripto', icon: '₿', color: '#F97316', position: 1 },
  { slug: 'acciones-y-bonos', name: 'Acciones y bonos', icon: '↗', color: '#3B82F6', position: 2 },
  { slug: 'impuestos', name: 'Impuestos', icon: '§', color: '#8B5CF6', position: 3 },
]

const ITEMS: ItemSeed[] = [
  // ---- Primeros pasos ----
  {
    seccion: 'primeros-pasos',
    title: 'Guía de protección a las personas inversoras (CNV)',
    description:
      'La guía oficial del regulador argentino: qué es el mercado de capitales, cómo reconocer tu perfil de inversor y qué derechos tenés. En PDF.',
    externalUrl: 'https://www.argentina.gob.ar/sites/default/files/texto_guia_de_inversoras_v2_0_2.pdf',
    pinned: true,
  },
  {
    seccion: 'primeros-pasos',
    title: 'Recomendaciones al inversor (CNV)',
    description:
      'Qué mirar antes de poner plata: verificar que el agente esté registrado, entender las comisiones y por qué conviene diversificar.',
    externalUrl: 'https://www.argentina.gob.ar/cnv/proteccion-al-inversor/recomendaciones-al-inversor',
  },
  {
    seccion: 'primeros-pasos',
    title: 'Protección al público inversor (CNV)',
    description:
      'El área de la Comisión Nacional de Valores que responde consultas del público y publica las alertas sobre operadores no autorizados.',
    externalUrl: 'https://www.argentina.gob.ar/cnv/proteccion-al-publico-inversor',
  },
  {
    seccion: 'primeros-pasos',
    title: 'Guías y herramientas de la CNV',
    description:
      'El índice de todas las guías que publica el regulador, desde cómo funciona una oferta pública hasta qué hacer ante un fraude.',
    externalUrl: 'https://www.argentina.gob.ar/cnv/guias-cnv',
  },

  // ---- Cripto ----
  {
    seccion: 'cripto',
    title: 'Advertencia sobre inversiones en activos virtuales (CNV)',
    description:
      'Lo que el regulador quiere que sepas antes de comprar cripto: no hay seguro de depósitos ni las protecciones que sí tiene el sistema financiero.',
    externalUrl: 'https://www.argentina.gob.ar/cnv/advertencia-al-publico-sobre-inversiones-en-activos-virtuales',
  },
  {
    seccion: 'cripto',
    title: 'Alerta del BCRA y la CNV sobre los riesgos de los criptoactivos',
    description:
      'El comunicado conjunto del Banco Central y la CNV: volatilidad, falta de transparencia, riesgo de manipulación de precios y de fraude.',
    externalUrl:
      'https://www.argentina.gob.ar/noticias/alerta-del-bcra-y-la-cnv-sobre-los-riesgos-e-implicancias-de-los-criptoactivos',
  },
  {
    seccion: 'cripto',
    title: 'Registro de Proveedores de Servicios de Activos Virtuales (CNV)',
    description:
      'El padrón oficial de exchanges y billeteras registrados ante la CNV según la Ley 27.739. Sirve para chequear con quién estás operando.',
    externalUrl: 'https://www.argentina.gob.ar/cnv/registro-de-proveedores-de-servicios-de-activos-virtuales',
  },

  // ---- Acciones y bonos ----
  {
    seccion: 'acciones-y-bonos',
    title: 'Qué es un CEDEAR (BYMA)',
    description:
      'La explicación del propio mercado: cómo un certificado emitido en Argentina te da exposición a una acción que cotiza afuera, y qué es el ratio de conversión.',
    externalUrl: 'https://www.byma.com.ar/productos/productos-financieros/cedears',
  },
  {
    seccion: 'acciones-y-bonos',
    title: 'BYMA Educa: cursos gratuitos de bolsa',
    description:
      'La plataforma de educación financiera de Bolsas y Mercados Argentinos, con cursos online gratuitos sobre acciones, CEDEARs y bonos.',
    externalUrl: 'https://www.bymaeduca.com.ar/',
  },
  {
    seccion: 'acciones-y-bonos',
    title: 'CEDEARs de ETF en el mercado argentino (BYMA)',
    description:
      'Qué son los CEDEARs de ETF y cómo permiten comprar un índice entero en pesos, desde el anuncio oficial del mercado.',
    externalUrl: 'https://www.byma.com.ar/newsroom/byma-incorpora-5-cedears-de-etf',
  },

  // ---- Impuestos ----
  {
    seccion: 'impuestos',
    title: 'Ganancias y Bienes Personales (ARCA)',
    description:
      'El portal oficial de los dos impuestos que tocan a un inversor persona humana en Argentina. Punto de entrada a normativa, vencimientos y aplicativos.',
    externalUrl: 'https://www.afip.gob.ar/gananciasYBienes/',
  },
  {
    seccion: 'impuestos',
    title: 'Qué bienes alcanza el Impuesto sobre los Bienes Personales (ARCA)',
    description:
      'El listado oficial de bienes gravados. Incluye acciones, cuotas y participaciones sociales, y los depósitos a plazo fijo y caja de ahorro.',
    externalUrl: 'https://www.afip.gob.ar/gananciasybienes/bienes-personales/conceptos-basicos/bienes-alcanzados.asp',
  },
  {
    seccion: 'impuestos',
    title: 'Alícuotas del Impuesto sobre los Bienes Personales (ARCA)',
    description: 'Qué es el impuesto, quiénes lo pagan y con qué alícuotas, según la escala vigente publicada por ARCA.',
    externalUrl: 'https://www.afip.gob.ar/gananciasYBienes/bienes-personales/conceptos-basicos/alicuotas.asp',
  },
]

export default class ContentSeeder extends BaseSeeder {
  static environment = ['production', 'development', 'testing']

  async run() {
    // Los contenidos quedan atribuidos a un admin si hay alguno. `created_by` es
    // nullable con `ON DELETE SET NULL`, así que si todavía no existe ninguno
    // (base recién creada) el seed igual corre y los deja sin autor.
    const admin = await User.query().where('role', 'admin').orderBy('created_at', 'asc').first()

    const idPorSlug = new Map<string, string>()
    for (const s of SECCIONES) {
      const seccion = await ContentSection.updateOrCreate(
        { slug: s.slug },
        { slug: s.slug, name: s.name, icon: s.icon, color: s.color, position: s.position }
      )
      idPorSlug.set(s.slug, seccion.id)
    }

    for (const item of ITEMS) {
      const sectionId = idPorSlug.get(item.seccion)
      if (!sectionId) continue

      const existente = await ContentItem.findBy('external_url', item.externalUrl)

      if (existente) {
        // Se refresca el texto y la ubicación, pero no `published_at`: si un
        // usuario ya vio el contenido, re-correr el seed no debería volver a
        // mostrárselo con el badge de NUEVO.
        existente.merge({
          sectionId,
          title: item.title,
          description: item.description,
          pinned: item.pinned ?? false,
        })
        await existente.save()
        continue
      }

      await ContentItem.create({
        sectionId,
        type: 'link',
        title: item.title,
        description: item.description,
        externalUrl: item.externalUrl,
        status: 'published',
        pinned: item.pinned ?? false,
        publishedAt: DateTime.now(),
        createdBy: admin?.id ?? null,
      })
    }
  }
}
