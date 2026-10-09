import { useRef, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, ListItemIcon, Menu, MenuItem, TextField, Typography } from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useAppContext } from '../../contexts/AppContext'

const surface = { bgcolor: 'var(--card-background)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '14px' }

const TopicActions = ({ target, onClose }) => {
  const { handleRenameTopic, handleDeleteTopic } = useAppContext()
  const [dialog, setDialog] = useState(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  const openDialog = action => {
    setDialog({ action, topic: target.topic })
    setName(target.topic.name)
    setError('')
    onClose()
  }
  const closeDialog = () => { if (!busyRef.current) setDialog(null) }
  const submit = async event => {
    event.preventDefault()
    if (busyRef.current || !dialog || (dialog.action === 'rename' && !name.trim())) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      const result = dialog.action === 'rename'
        ? await handleRenameTopic(dialog.topic.id, name.trim())
        : await handleDeleteTopic(dialog.topic.id)
      if (result.success) setDialog(null)
      else setError(result.error || '操作失败，请重试')
    } catch (failure) {
      setError(failure.message || '操作失败，请重试')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  const deleting = dialog?.action === 'delete'

  return (
    <>
      <Menu id="topic-actions-menu" anchorEl={target?.anchor || null} open={!!target} onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { ...surface, minWidth: 156, mt: 0.5, p: 0.5, '& .MuiMenuItem-root': { borderRadius: '8px', fontSize: 13, py: 1 }, '& .MuiMenuItem-root:hover': { bgcolor: 'var(--hover-bg)' } } } }}>
        <MenuItem onClick={() => openDialog('rename')}>
          <ListItemIcon sx={{ color: 'var(--text-secondary)', minWidth: '30px !important' }}><EditOutlinedIcon fontSize="small" /></ListItemIcon>
          编辑标题
        </MenuItem>
        <MenuItem onClick={() => openDialog('delete')} sx={{ color: 'var(--error-color)' }}>
          <ListItemIcon sx={{ color: 'inherit', minWidth: '30px !important' }}><DeleteOutlineIcon fontSize="small" /></ListItemIcon>
          删除话题
        </MenuItem>
      </Menu>
      <Dialog open={!!dialog} onClose={closeDialog} fullWidth maxWidth="xs" aria-labelledby="topic-action-title"
        slotProps={{ paper: { sx: surface } }}>
        <Box component="form" onSubmit={submit}>
          <DialogTitle id="topic-action-title" sx={{ fontSize: 18, fontWeight: 600, pb: 1 }}>{deleting ? '删除话题' : '编辑标题'}</DialogTitle>
          <DialogContent sx={{ pt: '12px !important' }}>
            {deleting ? (
              <>
                <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1, overflowWrap: 'anywhere', maxHeight: 120, overflowY: 'auto' }}>{dialog?.topic.name}</Typography>
                <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>此话题的所有对话和分支将一并删除，无法恢复。</Typography>
              </>
            ) : (
              <TextField autoFocus fullWidth label="话题标题" value={name} disabled={busy} onChange={event => setName(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) event.preventDefault() }}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'data-topic-title-input': true } }}
                sx={{ '& .MuiInputBase-root': { color: 'var(--text-color)', fontSize: 14 }, '& .MuiInputLabel-root': { color: 'var(--text-secondary)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-color)' }, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--text-secondary)' }, '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--primary-color)' } }} />
            )}
            {error && <Alert severity="error" sx={{ mt: 2, bgcolor: 'var(--error-bg)', color: 'var(--error-color)', fontSize: 13 }}>{error}</Alert>}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 0.5 }}>
            <Button disabled={busy} onClick={closeDialog} sx={{ color: 'var(--text-secondary)', borderRadius: '8px' }}>取消</Button>
            <Button type="submit" variant="contained" disableElevation disabled={busy || (!deleting && !name.trim())}
              sx={{ bgcolor: deleting ? 'var(--error-color)' : 'var(--primary-color)', borderRadius: '8px', px: 2, '&:hover': { bgcolor: deleting ? 'var(--error-color)' : 'var(--primary-hover)', filter: deleting ? 'brightness(0.9)' : undefined } }}>
              {busy ? (deleting ? '删除中...' : '保存中...') : (deleting ? '删除' : '保存')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  )
}

export default TopicActions
