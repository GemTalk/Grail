"Python traceback object -- the linked list ``exc.__traceback__`` points at.

Each node carries one frame at one source position.  CPython derives the
column span lazily from ``co_positions(tb_lasti)``; Grail has no bytecode, so
the PEP 657 quadruple is stored directly on the node:

  tb_frame        a PyFrame
  tb_lineno       1-based start line
  tb_next         the next (deeper) PyTraceback, or the None singleton
  tb_end_lineno   1-based end line
  tb_colno        0-based absolute start column
  tb_end_colno    0-based absolute end column
  tb_line         the source line text (raw; traceback.FrameSummary strips it)

Nodes are prepended as an exception unwinds (Phase 2), so the head is the
shallowest frame and ``extract_tb(tb)[0]`` is the frame that caught the
exception -- matching CPython.  ``tb_next`` is ALWAYS stored (as None on the
last node) so ``while cur is not None`` terminates: a nil dynamic instVar is
treated as absent by the ___pyAttrLoad___ probe and would not answer None.

Part of Phase 1 of the traceback design (docs/Python_Traceback_Design.md).

"
Class {
	#name : 'PyTraceback',
	#superclass : 'object',
	#category : 'Grail-Tracebacks'
}

{ #category : 'Instance Creation' }
PyTraceback class >> frame: aFrame lineno: aLineno next: aNext endLineno: anEndLineno colno: aColno endColno: anEndColno line: aLine [
	"Build a traceback node.  ``aNext`` must be either a PyTraceback or the
	Python None singleton -- never Smalltalk nil."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'tb_frame' put: aFrame.
	inst dynamicInstVarAt: #'tb_lineno' put: aLineno.
	inst dynamicInstVarAt: #'tb_next' put: aNext.
	inst dynamicInstVarAt: #'tb_end_lineno' put: anEndLineno.
	inst dynamicInstVarAt: #'tb_colno' put: aColno.
	inst dynamicInstVarAt: #'tb_end_colno' put: anEndColno.
	inst dynamicInstVarAt: #'tb_line' put: aLine.
	"CPython's tb_lasti is the BYTECODE offset the frame was executing at, and
	the only documented consumer is a disassembler.  Grail compiles to Smalltalk
	and has no bytecode offset to report, so every node carries -1 -- which is
	not a placeholder invented here but CPython's OWN value for ``no instruction
	index'', used for frames it synthesises.  It is an int, which is what
	test_raise's test_attrs asserts, and it is honest about being unknown in a
	way that 0 would not be."
	inst dynamicInstVarAt: #'tb_lasti' put: -1.
	^ inst

]

{ #category : 'Grail-Traceback Building' }
PyTraceback >> ___setNext: aNext [
	"Re-point tb_next when prepending a new head during unwind (Phase 2)."

	self dynamicInstVarAt: #'tb_next' put: aNext.
	^ self

]
