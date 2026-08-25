import { Module } from '@nestjs/common'
import { Icd10Controller } from './icd10.controller.js'
import { Icd10Service } from './icd10.service.js'

@Module({
  controllers: [Icd10Controller],
  providers: [Icd10Service],
  exports: [Icd10Service],
})
export class Icd10Module {}
