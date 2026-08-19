import subprocess

R = {}
R['run_echo'] = subprocess.run(['echo', 'hi'], capture_output=True).stdout == b'hi\n'
R['run_text'] = subprocess.run(['echo', 'hi'], capture_output=True, text=True).stdout == 'hi\n'
R['returncode'] = subprocess.run(['sh', '-c', 'exit 5']).returncode == 5
R['check_output'] = subprocess.check_output(['echo', 'abc']) == b'abc\n'
R['stderr_sep'] = subprocess.run(['sh', '-c', 'echo O; echo E >&2'],
                                 capture_output=True).stderr == b'E\n'
r = subprocess.run(['sh', '-c', 'echo O; echo E >&2'], stdout=subprocess.PIPE,
                   stderr=subprocess.STDOUT)
R['stderr_merge'] = b'O\n' in r.stdout and b'E\n' in r.stdout
R['input_bytes'] = subprocess.run(['cat'], input=b'xyz', capture_output=True).stdout == b'xyz'
R['input_text'] = subprocess.run(['cat'], input='abc', capture_output=True,
                                 text=True).stdout == 'abc'
R['shell'] = subprocess.run('echo shelled', shell=True, capture_output=True).stdout == b'shelled\n'
R['cwd'] = subprocess.run(['pwd'], cwd='/tmp', capture_output=True).stdout == b'/tmp\n'
R['env'] = subprocess.run(['sh', '-c', 'echo $ZZ'], env={'ZZ': 'val'},
                          capture_output=True).stdout == b'val\n'
R['getoutput'] = subprocess.getoutput('echo go') == 'go'
R['getstatusoutput'] = subprocess.getstatusoutput('exit 3; echo x')[0] == 3
R['call'] = subprocess.call(['true']) == 0
R['check_call_ok'] = subprocess.check_call(['true']) == 0

try:
    subprocess.check_call(['sh', '-c', 'exit 2'])
    R['check_call_raises'] = False
except subprocess.CalledProcessError as e:
    R['check_call_raises'] = (e.returncode == 2)

try:
    subprocess.check_output(['sh', '-c', 'exit 4'])
    R['check_output_raises'] = False
except subprocess.CalledProcessError as e:
    R['check_output_raises'] = (e.returncode == 4)

try:
    subprocess.run(['no_such_program_xyz'])
    R['missing_raises'] = False
except FileNotFoundError:
    R['missing_raises'] = True

try:
    subprocess.run(['sleep', '30'], timeout=0.7, capture_output=True)
    R['timeout_raises'] = False
except subprocess.TimeoutExpired:
    R['timeout_raises'] = True

p = subprocess.Popen(['sleep', '30'])
R['poll_running'] = p.poll() is None
R['pid_positive'] = p.pid > 0
p.kill()
R['kill_negative_rc'] = p.wait() == -9

p = subprocess.Popen(['sleep', '30'])
p.terminate()
R['terminate_rc'] = p.wait() == -15

with subprocess.Popen(['echo', 'ctx'], stdout=subprocess.PIPE) as p:
    R['ctx_mgr'] = p.communicate()[0] == b'ctx\n'

p = subprocess.Popen(['cat'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
p.stdin.write(b'streamed')
p.stdin.close()
R['popen_stdin_obj'] = p.communicate()[0] == b'streamed'

big = subprocess.run(['sh', '-c',
    'i=0; while [ $i -lt 3000 ]; do echo 0123456789012345678901234567890123456789; i=$((i+1)); done'],
    capture_output=True)
R['big_output'] = len(big.stdout) == 3000 * 41

R['completed_repr'] = 'CompletedProcess(' in repr(subprocess.run(['true']))

try:
    subprocess.run(['echo'], preexec_fn=lambda: None)
    R['preexec_rejected'] = False
except ValueError:
    R['preexec_rejected'] = True

RESULTS = R
