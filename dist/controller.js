"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require("uuid");
const zmq = require("zmq");
const Tensor_1 = require("./Tensor");
const WorkQueue_1 = require("./WorkQueue");
const Model_1 = require("./Model");
const AsyncClass_1 = require("./AsyncClass");
exports.verbose = !!process.argv[2];
const identity = uuid.v4();
const socket = zmq.socket('dealer');
socket.identity = identity;
socket.connect('tcp://localhost:5555');
function log(...args) {
    if (exports.verbose) {
        console.log(...args);
    }
}
exports.log = log;
function cmd(options) {
    return Object.assign({ objectType: 'controller', objectIndex: '-1', tensorIndexParams: [] }, options);
}
exports.cmd = cmd;
const wq = new WorkQueue_1.WorkQueue(job => {
    log('sending:', job.data);
    socket.send(job.data);
}, 1);
socket.on('message', (res) => {
    let job;
    for (let id in wq.working) {
        job = wq.working[id];
    }
    if (job) {
        let r = res.toString();
        log('receiving:', r);
        if (r.startsWith('Unity Error:')) {
            job.reject(new Error(r));
        }
        else {
            job.resolve(r);
        }
    }
});
async function num_models() {
    return sendJSON(cmd({
        functionCall: 'num_models'
    }), 'int');
}
exports.num_models = num_models;
async function load(filename) {
    return sendJSON(cmd({
        functionCall: 'load_floattensor',
        tensorIndexParams: [filename]
    }), 'FloatTensor');
}
exports.load = load;
function save(x, filename) {
    return x.save(filename);
}
exports.save = save;
function concatenate(tensors, axis = 0) {
    let ids = tensors.map(t => t.id);
    return sendJSON(cmd({
        functionCall: 'concatenate',
        tensorIndexParams: [axis, ...ids]
    }), 'FloatTensor');
}
exports.concatenate = concatenate;
function num_tensors() {
    return sendJSON(cmd({
        functionCall: 'num_tensors'
    }), 'int');
}
exports.num_tensors = num_tensors;
function new_tensors_allowed(allowed) {
    if (allowed == null) {
        return sendJSON(cmd({
            functionCall: 'new_tensors_allowed'
        }), 'bool');
    }
    else if (allowed) {
        return sendJSON(cmd({
            functionCall: 'new_tensors_allowed',
            tensorIndexParams: ['True']
        }), 'bool');
    }
    else {
        return sendJSON(cmd({
            functionCall: 'new_tensors_allowed',
            tensorIndexParams: ['False']
        }), 'bool');
    }
}
exports.new_tensors_allowed = new_tensors_allowed;
function get_tensor(id) {
    return new Tensor_1.FloatTensor(AsyncClass_1.AsyncInstance, id);
}
exports.get_tensor = get_tensor;
function __getitem__(id) {
    return get_tensor(id);
}
exports.__getitem__ = __getitem__;
async function sendJSON(message, return_type) {
    let data = JSON.stringify(message);
    let res = await wq.queue(data);
    if (return_type == null) {
        return;
    }
    else if (return_type === 'FloatTensor') {
        if (res !== '-1' && res !== '') {
            return new Tensor_1.FloatTensor(AsyncClass_1.AsyncInstance, res);
        }
        return;
    }
    else if (return_type === 'IntTensor') {
        if (res !== '-1' && res !== '') {
            return new Tensor_1.IntTensor(AsyncClass_1.AsyncInstance, res);
        }
        return;
    }
    else if (return_type === 'FloatTensor_list') {
        let tensors = [];
        if (res !== '') {
            let ids = res.split(',');
            for (let str_id in ids) {
                if (str_id) {
                    tensors.push(new Tensor_1.FloatTensor(AsyncClass_1.AsyncInstance, str_id));
                }
            }
        }
        return tensors;
    }
    else if (return_type === 'Model_list') {
        let models = [];
        if (res !== '') {
            let ids = res.split(',');
            for (let str_id in ids) {
                if (str_id) {
                    models.push(await Model_1.Model.getModel(str_id));
                }
            }
        }
        return models;
    }
    else if (return_type === 'int' || return_type === 'float') {
        return Number(res);
    }
    else if (return_type === 'string') {
        return String(res);
    }
    else if (return_type === 'bool') {
        if (res === 'True') {
            return true;
        }
        else if (res === 'False') {
            return false;
        }
    }
    return res;
}
exports.sendJSON = sendJSON;
//# sourceMappingURL=controller.js.map