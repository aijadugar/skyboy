package main

// Folder enumeration for the bundle builder (zipbundle.go) and the update
// flow's temp staging. The single-skill zip helper that used to live here is
// superseded by buildBundleFile in zipbundle.go.

import (
	"os"
	"path/filepath"
)

// collectFolderEntries walks one repo folder recursively via the contents API.
func collectFolderEntries(folder string) ([]ghEntry, error) {
	var entries []ghEntry
	queue := []string{folder}
	for len(queue) > 0 {
		dir := queue[0]
		queue = queue[1:]
		children, err := listDir(dir)
		if err != nil {
			return nil, err
		}
		for _, child := range children {
			if child.Type == "dir" {
				queue = append(queue, child.Path)
			} else {
				entries = append(entries, child)
			}
		}
	}
	return entries, nil
}
