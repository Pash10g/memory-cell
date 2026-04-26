import { MongoClient } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set')
}

const uri = process.env.MONGODB_URI

const options = {
  appName: 'devrel-integration-memory-vercel-typescript',
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // In development, reuse the MongoClient across hot-reloads (HMR)
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, options).connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  clientPromise = new MongoClient(uri, options).connect()
}

export default clientPromise
