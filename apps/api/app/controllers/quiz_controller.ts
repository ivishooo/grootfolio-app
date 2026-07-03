/**
 * QuizController (GF-2 / GF-9). Cuestionario de perfil de inversor del usuario
 * autenticado (via `ctx.currentUser`).
 *
 * - GET  /quiz         preguntas activas con sus opciones (ordenadas)
 * - POST /quiz/submit  califica las respuestas -> perfil, persiste el intento y
 *                      guarda el perfil en el usuario
 * - GET  /quiz/result  ultimo perfil calculado del usuario (o null)
 *
 * El puntaje y la clasificacion viven en `#services/quiz/risk_profile`. La
 * descripcion/recomendaciones se derivan del perfil (no se persisten).
 */
import { randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import type { RiskProfileType } from '@grootfolio/shared/types'
import QuizQuestion from '#models/quiz_question'
import QuizOption from '#models/quiz_option'
import QuizResponse from '#models/quiz_response'
import { submitQuizValidator } from '#validators/quiz'
import { classifyProfile, profileContent } from '#services/quiz/risk_profile'

export default class QuizController {
  /** GET /quiz — preguntas activas con opciones. */
  async questions({ response }: HttpContext) {
    const questions = await QuizQuestion.query()
      .where('active', true)
      .preload('options', (q) => q.orderBy('order', 'asc'))
      .orderBy('order', 'asc')

    return response.status(200).send({
      questions: questions.map((q) => ({
        id: q.id,
        order: q.order,
        text: q.text,
        options: q.options.map((o) => ({ id: o.id, label: o.label, score: o.score })),
      })),
    })
  }

  /** POST /quiz/submit — califica, persiste el intento y guarda el perfil. */
  async submit({ request, response, currentUser }: HttpContext) {
    const { answers } = await request.validateUsing(submitQuizValidator)

    const activeQuestions = await QuizQuestion.query().where('active', true).select('id')
    const activeIds = new Set(activeQuestions.map((q) => q.id))

    const options = await QuizOption.query().whereIn(
      'id',
      answers.map((a) => a.optionId)
    )
    const optionById = new Map(options.map((o) => [o.id, o]))

    // Cada respuesta debe apuntar a una opcion existente que pertenezca a su
    // pregunta, y la pregunta debe estar activa.
    for (const a of answers) {
      const opt = optionById.get(a.optionId)
      if (!opt || opt.questionId !== a.questionId || !activeIds.has(a.questionId)) {
        return response.status(422).send({
          code: 'QUIZ_INVALID_ANSWER',
          message: 'Alguna respuesta no es valida.',
        })
      }
    }

    // Exactamente una respuesta por pregunta activa (ni de menos ni de mas).
    const answeredQuestions = new Set(answers.map((a) => a.questionId))
    if (answeredQuestions.size !== activeIds.size || answeredQuestions.size !== answers.length) {
      return response.status(422).send({
        code: 'QUIZ_INCOMPLETE',
        message: 'Tenes que responder todas las preguntas (una opcion por pregunta).',
      })
    }

    const score = answers.reduce((sum, a) => sum + (optionById.get(a.optionId)?.score ?? 0), 0)
    const profile = classifyProfile(score)
    const calculatedAt = DateTime.now()
    const attemptId = randomUUID()

    await QuizResponse.createMany(
      answers.map((a) => ({
        userId: currentUser.id,
        attemptId,
        questionId: a.questionId,
        optionId: a.optionId,
      }))
    )

    currentUser.riskProfile = profile
    currentUser.riskScore = score
    currentUser.riskCalculatedAt = calculatedAt
    await currentUser.save()

    const { description, recommendations } = profileContent(profile)
    return response.status(200).send({
      result: { profile, score, description, recommendations, calculatedAt: calculatedAt.toISO() },
    })
  }

  /** GET /quiz/result — ultimo perfil calculado del usuario, o null. */
  async result({ response, currentUser }: HttpContext) {
    if (!currentUser.riskProfile || currentUser.riskScore === null) {
      return response.status(200).send({ result: null })
    }

    const profile = currentUser.riskProfile as RiskProfileType
    const { description, recommendations } = profileContent(profile)
    return response.status(200).send({
      result: {
        profile,
        score: currentUser.riskScore,
        description,
        recommendations,
        calculatedAt: currentUser.riskCalculatedAt?.toISO() ?? null,
      },
    })
  }
}
