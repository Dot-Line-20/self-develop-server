import { Request, Response, NextFunction } from 'express'
import { getFirestore } from 'firebase-admin/firestore'
import { v5 as uuidv5 } from 'uuid'
import { isIdExists, isEmailExists } from '@lib/exist'
import HttpException from '@exceptions/http'
import UserDto from './user.dto'
import { createHash, randomBytes } from 'crypto'

// addUser
export default async function (
  request: Request<UserDto>,
  response: Response,
  next: NextFunction
): Promise<void> {
  const body: UserDto & { salt: string } = request.body
  const uuid: string = uuidv5(body.email, uuidv5.URL)

  try {
    if (!(await isEmailExists(uuid))) {
      if (!(await isIdExists(body.id))) {
        body.salt = randomBytes(128).toString('base64')

				while(body.salt.charAt(body.salt.length - 1) === '=') {
					body.salt = body.salt.slice(0, -1)
				}

        body.password = createHash('sha256')
          .update(body.password + '+' + body.salt)
          .digest()
          .toString('hex')

        await getFirestore().collection('users').doc(uuid).set(body)

        response.json({ message: 'sucess' })
      } else {
        throw new HttpException(400, 'existing id')
      }
    } else {
      throw new HttpException(400, 'existing email')
    }
  } catch (error: any) {
    console.log(error)

    next(
      error instanceof HttpException
        ? error
        : new HttpException(500, 'server error')
    )
  }

  return
}
