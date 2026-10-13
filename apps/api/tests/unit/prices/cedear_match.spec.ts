/**
 * Tests del chequeo de razon social que valida los CEDEARs del buscador.
 *
 * El caso que lo motivo: asumir que `XXX.BA` es el CEDEAR de `XXX` es falso.
 * BYMA reasigna tickers y lista series en dolares de la misma especie, asi que
 * `BAC.BA` NO es Bank of America sino el CEDEAR de Boeing en su serie en
 * dolares. Sin este chequeo, buscar "Bank of America" ofrecia el CEDEAR de
 * Boeing etiquetado como si fuera de Bank of America.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mismaEmpresa } from '../../../app/services/prices/providers/yahoo_provider.js'

test('el caso real: BAC.BA es Boeing, no Bank of America', () => {
  assert.equal(
    mismaEmpresa('Bank of America Corporation', 'BOEING CO CEDEAR EACH 24 REP 1'),
    false
  )
})

test('el CEDEAR legitimo de Boeing si matchea', () => {
  assert.equal(mismaEmpresa('The Boeing Company', 'The Boeing Company'), true)
})

test('nombres identicos matchean', () => {
  assert.equal(mismaEmpresa('Adobe Inc.', 'Adobe Inc.'), true)
  assert.equal(mismaEmpresa('MercadoLibre, Inc.', 'MercadoLibre, Inc.'), true)
})

test('alcanza con compartir un token significativo', () => {
  assert.equal(mismaEmpresa('The Coca-Cola Company', 'COCA COLA CO CEDEAR'), true)
  assert.equal(mismaEmpresa('Alphabet Inc.', 'ALPHABET INC CEDEAR EACH 58 REP 1'), true)
})

test('las formas societarias solas no alcanzan para matchear', () => {
  // Si "INC" o "COMPANY" contaran, cualquier par de empresas matchearia.
  assert.equal(mismaEmpresa('Pfizer Inc.', 'Oracle Inc.'), false)
  assert.equal(mismaEmpresa('The Boeing Company', 'The Walt Disney Company'), false)
})

test('el ruido que BYMA mete en el nombre no genera falsos positivos', () => {
  // Dos CEDEARs distintos comparten "CEDEAR", "EACH" y "REP": no son la misma.
  assert.equal(
    mismaEmpresa('NVIDIA CORP CEDEAR EACH 24 REP 1', 'INTEL CORP CEDEAR EACH 12 REP 1'),
    false
  )
})

test('es simetrico', () => {
  assert.equal(mismaEmpresa('Vista Energy, S.A.B. de C.V.', 'VISTA ENERGY CEDEAR'), true)
  assert.equal(mismaEmpresa('VISTA ENERGY CEDEAR', 'Vista Energy, S.A.B. de C.V.'), true)
})
