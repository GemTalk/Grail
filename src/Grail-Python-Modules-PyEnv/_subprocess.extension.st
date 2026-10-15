Extension { #name : '_subprocess' }

{ #category : 'Grail-Spawning' }
_subprocess >> spawn: argvList _: cwd _: envPairs _: modes [
	"Fork a child; answers the handle subprocess.Popen drives.

	argv    list of str
	cwd     str or None
	env     list of 'K=V' str replacing the environment, or None
	modes   [stdin, stdout, stderr] ints -- 0 inherit, 1 PIPE, 2 DEVNULL,
	        3 stderr-to-stdout"

	^ PyHostProcess ___spawn___: argvList _: cwd _: envPairs _: modes

]

{ #category : 'Grail-Spawning' }
_subprocess >> which: prog [
	"Absolute path for prog using PATH, or None -- the lookup execvp does.
	Exposed because shutil.which and subprocess's own error messages both
	want it, and it is the check that lets a missing program raise
	FileNotFoundError before any child exists."

	| r |
	r := PyHostProcess @env0:___resolveExecutable___: prog env: nil.
	r == nil ifTrue: [^ None].
	^ r

]
