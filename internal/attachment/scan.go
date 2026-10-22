package attachment

import "database/sql"

type rowScanner interface{ Scan(...any) error }

func scan(scanner rowScanner) (Attachment, error) {
	var item Attachment
	var uploader sql.NullString
	err := scanner.Scan(&item.ID, &item.OriginalName, &item.FileName, &item.StorageKey, &item.MIMEType, &item.Size, &item.URL, &item.CreatedAt, &uploader)
	item.Name = item.OriginalName
	item.UpdatedAt = item.CreatedAt
	item.References = []Reference{}
	if uploader.Valid {
		item.Uploader = uploader.String
	}
	return item, err
}
