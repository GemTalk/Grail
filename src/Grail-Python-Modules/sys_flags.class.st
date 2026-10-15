"Python sys.flags — the command-line / environment interpreter flags
(PEP structseq).  Grail exposes attribute access (sys.flags.optimize,
etc.); numpy's core init reads sys.flags.  All flags default to 0
(a normal, non-optimized, non-isolated interpreter)."
Class {
	#name : 'sys_flags',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}
