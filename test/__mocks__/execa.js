import { createExecaReturnValue } from '../utils/createExecaReturnValue'

const execa = jest.fn(() =>
  createExecaReturnValue({
    stdout: 'a-ok',
    stderr: '',
    code: 0,
    cmd: 'mock cmd',
    failed: false,
    killed: false,
    signal: null,
  })
)

module.exports = {
  execa: execa,
  execaCommand: execa,
}
