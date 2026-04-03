import { useState, useEffect, useRef } from 'react'
import { Box, Paper, Typography, List, ListItemButton, ListItemIcon, ListItemText, InputBase, Fade, Chip } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'

const SkillSelector = ({ skills, onSelect, onClose }) => {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef(null)

  const filtered = skills.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filtered, selectedIndex, onSelect, onClose])

  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex]
      selected?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  return (
    <Fade in={true} timeout={150}>
      <Paper
        elevation={8}
        sx={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          right: 0,
          mb: 1,
          maxHeight: 280,
          bgcolor: 'var(--card-background)',
          border: '1px solid var(--border-color)',
          borderRadius: 2,
          overflow: 'hidden',
          zIndex: 10
        }}
      >
        <Box sx={{ p: 1, borderBottom: '1px solid var(--border-color)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderRadius: 1, bgcolor: 'var(--hover-bg)' }}>
            <SearchIcon sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
            <InputBase
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索技能..."
              autoFocus
              sx={{ fontSize: 13, color: 'var(--text-color)', '& input::placeholder': { color: 'var(--text-secondary)' } }}
            />
          </Box>
        </Box>

        <List disablePadding sx={{ maxHeight: 220, overflow: 'auto', py: 0.5 }}>
          {filtered.length === 0 && (
            <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>未找到匹配的技能</Typography>
            </Box>
          )}
          {filtered.map((skill, index) => (
            <ListItemButton
              key={skill.id}
              ref={listRef}
              selected={index === selectedIndex}
              onClick={() => onSelect(skill)}
              sx={{
                py: 1, px: 2,
                '&.Mui-selected': { bgcolor: 'var(--hover-bg)' },
                '&:hover': { bgcolor: 'var(--hover-bg)' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, fontSize: 20, color: 'var(--text-color)' }}>
                {skill.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'var(--text-color)' }}>{skill.name}</Typography>
                    <Chip label="/" size="small" sx={{ fontSize: 9, height: 16, bgcolor: 'var(--hover-bg)', color: 'var(--primary-color)' }} />
                  </Box>
                }
                secondary={
                  <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)' }}>{skill.description}</Typography>
                }
              />
            </ListItemButton>
          ))}
        </List>

        <Box sx={{ px: 1.5, py: 0.5, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 1 }}>
          <Chip label="↑↓ 导航" size="small" sx={{ fontSize: 10, height: 18, bgcolor: 'var(--hover-bg)', color: 'var(--text-secondary)' }} />
          <Chip label="↵ 选择" size="small" sx={{ fontSize: 10, height: 18, bgcolor: 'var(--hover-bg)', color: 'var(--text-secondary)' }} />
          <Chip label="Esc 关闭" size="small" sx={{ fontSize: 10, height: 18, bgcolor: 'var(--hover-bg)', color: 'var(--text-secondary)' }} />
        </Box>
      </Paper>
    </Fade>
  )
}

export default SkillSelector
