import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tejgdmlmacieqcwydovf.supabase.co'
const supabaseKey = 'sb_publishable_iDfOMQTok-CoQUpTEtFhyw_TSg5ivnk'

export const supabase = createClient(supabaseUrl, supabaseKey)