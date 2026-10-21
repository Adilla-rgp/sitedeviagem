/** Copia texto para a área de transferência. Devolve false se o navegador recusar. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Sem a API moderna (contexto não seguro, permissão negada): tenta o método antigo.
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    try {
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      field.remove()
    }
  }
}
