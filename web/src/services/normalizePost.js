function finiteNumber(value) {
  try {
    const number = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(number) ? number : null
  } catch {
    return null
  }
}

function finiteNonNegativeNumber(value, fallback = 0) {
  const number = finiteNumber(value)
  return number !== null && number >= 0 ? number : fallback
}

function categoryName(category) {
  const value = category && typeof category === 'object' ? category.name : category
  return typeof value === 'string' && value.trim() ? value : '未分类'
}

function tagNames(tags) {
  if (!Array.isArray(tags)) return []
  return tags.flatMap((tag) => {
    const value = tag && typeof tag === 'object' ? tag.name : tag
    return typeof value === 'string' && value.trim() ? [value] : []
  })
}

export function normalizePost(post) {
  const source = post && typeof post === 'object' ? post : {}
  const content = typeof source.content === 'string' ? source.content : ''
  const wordCount = finiteNonNegativeNumber(source.word, content.length)
  const providedReadingTime = finiteNumber(source.reading_time)

  return {
    ...source,
    desc: typeof source.desc === 'string' ? source.desc : typeof source.description === 'string' ? source.description : '',
    category: categoryName(source.category),
    tags: tagNames(source.tags),
    content,
    reading_time: providedReadingTime !== null && providedReadingTime > 0 ? providedReadingTime : Math.max(1, Math.ceil(wordCount / 500)),
    view_count: finiteNonNegativeNumber(source.view_count),
    comments_count: finiteNonNegativeNumber(source.comments_count),
    cover: typeof source.cover === 'string' && source.cover ? source.cover : 'code',
    published_at: typeof source.published_at === 'string' ? source.published_at : null,
  }
}
