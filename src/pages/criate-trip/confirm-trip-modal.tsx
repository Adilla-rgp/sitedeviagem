import {X, User, Plus} from "lucide-react"
import type { FormEvent } from 'react'
import { Button } from "../../components/button"

interface ConfirmTripModalProps{
    closeConfirmTripModal: () => void
    createTrip: (event: FormEvent<HTMLFormElement>) => void
}

export function ConfirmTripModal({
    closeConfirmTripModal, 
    createTrip, 

}: ConfirmTripModalProps){
    return(
        <div className='fixed inset-0 bg-black/60 flex items-center justify-center'>
        <div className='w-[640px] round-xl px-5 py-6 shadow-shape bg-zinc-900 space-y-5'>
          <div className='space-y-2'>
            <div className=' flex items-center justify-between'>
              <h2 className='text-lg font-semibold'>Confirma criação de viagem</h2>
              <button type='button' onClick={closeConfirmTripModal}>
                <X className="size-5 text-zinc-400" />
              </button>
            </div>
            <p className='text-sm text-zinc-400'>
              Para concluir a criação de uma viagem para <span className='font-semibold text-zinc-100'>Paris, Brasil </span>
              nas datas de <span className='font-semibold text-zinc-100'> 16 a 27 de agosto de 2024 </span> preencha seus dados abaixo:
            </p>
          </div>
          <form onSubmit={createTrip} className='space-y-3'>
            <div className='h-14 px-4 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center gap-2'>
              <User className='text-zinc-400 size-5' />
              <input type='text' name='name' placeholder='Seu nome completo ' className='bg-transparent text-lg placeholder-zinc-400 outline-none flex-1' />
            </div>

            <div className='h-14 px-4 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center gap-2'>
              <User className='text-zinc-400 size-5' />
              <input type='email' name='email' placeholder='Seu e-mail pessoal ' className='bg-transparent text-lg placeholder-zinc-400 outline-none flex-1' />
            </div>

            <Button type="submit" variant="primary" size='full'>
                <Plus className='size-5'/>
                Confirma criação da viagem
            </Button>
          </form>
        </div>
      </div>
    )
}