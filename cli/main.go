package main

// Process-level exit plumbing. main() defers nothing that needs flushing
// before os.Exit (the stdio writer is flushed per frame), so a plain exit
// code variable set by run()'s error path is all the control flow needed.

import (
	"fmt"
	"io"
	"os"
)

var exitCode = 0

var stderr io.Writer = os.Stderr

var stdout io.Writer = os.Stdout

func osExit(code int) { os.Exit(code) }

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(stderr, "skyboy: %v\n", err)
		exitCode = 1
	}
	osExit(exitCode)
}
