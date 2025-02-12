! ------------------- Remove existing behavior from TupleTestCase
removeallmethods TupleTestCase
removeallclassmethods TupleTestCase
! ------------------- Class methods for TupleTestCase
! ------------------- Instance methods for TupleTestCase
category: 'other'
method: TupleTestCase
testJoinedStr
  | pyString result |
  
  pyString := 'sequences := "abcdedfg".
               print(f"Sequences: {sequences}")'.
  
  result := ModuleAst evaluate: pyString.
%
category: 'other'
method: TupleTestCase
testTupleAssignment

  | pyString result |
  pyString := 'for a, b in [(1, 2)]: pass'.
  result := ModuleAst evaluate: pyString.
%
category: 'other'
method: TupleTestCase
testTupleID

  | pyString result sequences seq_id sequence |
	sequences := Dictionary new.
    sequences at: 'seq1' put: 'ATGCATGC'.
    sequences at: 'seq2' put: 'GGTCCGGA'.
	
	result := seq_id id.
	
	result := ModuleAst evaluate: pyString.
%
