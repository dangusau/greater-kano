async deleteMember(profileId: string) {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token

    if (!token) {
      return { success: false, error: new Error('No active session') }
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-member`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: profileId }),
    })

    let result
    try {
      result = await response.json()
    } catch (e) {
      // If response is not JSON, get the text
      const text = await response.text()
      return { success: false, error: new Error(`Server returned ${response.status}: ${text}`) }
    }

    if (!response.ok) {
      return { success: false, error: new Error(result.error || `Request failed with status ${response.status}`) }
    }

    return { success: true, error: null }
  } catch (err) {
    console.error('Unexpected error deleting member:', err)
    return { success: false, error: err }
  }
}
