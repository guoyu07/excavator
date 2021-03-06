var express = require('express');
var router = express.Router();
var Form = require('../models/form');
var FormRevision = require('../models/form-revision');
var Submission = require('../models/submission');
var Manager = require('../models/manager');
var jsonParser = require('body-parser').json();
var largerJsonParser = require('body-parser').json({
  limit: '500kb'
});
var Q = require('q');

function QQ (promise) {
  return Q.nbind(promise.exec, promise)();
}

function makeRegexp (input) {
  return new RegExp(input.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
}

router.get('/', function (req, res, next) {
  var manager = req.query.manager;
  var promise;

  if (manager) {
    promise = Manager.findOne({ username: manager }).populate('forms');
    promise = Q.nbind(promise.exec, promise)().then(function (manager) {
      if (!manager) return Q.resolve([]);
      return Q.nbind(Form.populate, Form)(manager.forms, {
        path: 'head',
        select: 'title'
      });
    });
  } else {
    promise = Form.find({}).sort({ _id: -1 }).skip(0).limit(20);
    promise = promise.populate('head', 'title template');
    promise = Q.nbind(promise.exec, promise)().then(function (forms) {
      return Q.all(forms.map(function (form) {
        return Q.nbind(form.head.populate, form.head)('template', '-files').
        then(function (head) {
          form.head = head;
          return form;
        });
      }));
    });
  }
  promise.then(function (forms) {
    res.send(forms);
  }).catch(next)
});

router.get('/search', function (req, res, next) {
  var query = req.query.query;
  var find;
  if (query) {
    var regex = makeRegexp(query);
    var conditions = [
      { slug: regex },
      { title: regex }
    ];
    if (/^[a-f0-9]{24}$/.test(query)) {
      conditions.push({ _id: query });
    }
    find = { $or: conditions };
  } else {
    find = {};
  }
  QQ(Form.find(find).sort({ _id: -1 }).skip(0).limit(5)).then(function (forms) {
    res.send(forms);
  }).catch(next);
});

router.post('/:formid/publish', function (req, res, next) {
  Form.publish(req.params.formid).then(function (form) {
    res.send(form);
  }).catch(next);
});

router.delete('/:formid/publish', function (req, res, next) {
  Form.unpublish(req.params.formid).then(function (form) {
    res.send(form);
  }).catch(next);
});

router.post('/:formid/managers', jsonParser, function (req, res, next) {
  Form.updateManagers(
    req.params.formid,
    req.body
  ).then(function (form) {
    res.send(form);
  }).catch(next);
});

router.post('/:formid/templates', jsonParser, function (req, res, next) {
  Q.nbind(Form.findById, Form)(req.params.formid).then(function (form) {
    return form.applyTemplate(req.body.template);
  }).then(function (formRev) {
    res.send(formRev);
  }).catch(next);
});

router.get('/:formid/stats', function (req, res, next) {
  var formid = req.params.formid;
  QQ(Form.findById(formid).populate('head')).then(function (form) {
    if (!form) return next('not-found');
    var formContent = form.head.content;
    var schemes = JSON.parse(formContent).scheme;
    form = form.toObject();
    form.stats = {
      scheme: []
    };
    var allPromises = [];
    for (var i = 0; i < schemes.length; i++) {
      var scheme = schemes[i];
      var model = scheme.model;
      if (model.indexOf('undetermined') === 0) {
        continue;
      }
      var enums = scheme.enum;
      if (!(enums instanceof Array)) {
        continue;
      }
      var data = {
        index: i,
        model: model,
        label: scheme.label,
        type: scheme.type,
        enums: []
      };
      var promises = [];
      for (var j = 0; j < enums.length; j++) {
        var condition = { form: form._id };
        condition['data.' + model] = {
          $eq: enums[j]
        };
        promises.push(QQ(Submission.count(condition)));
        data.enums.push({
          value: enums[j]
        });
      }
      form.stats.scheme.push(data);
      allPromises.push(promises);
    }
    return Q.all([
      QQ(Submission.count({ form: form._id })),
      Q.all(allPromises.map(function (promises) {
        return Q.all(promises);
      }))
    ]).then(function (ret) {
      form.stats.count = ret[0];
      ret[1].forEach(function (item, i) {
        item.forEach(function (count, j) {
          form.stats.scheme[i].enums[j].count = count;
        });
      });
      res.send(form);
    });
  }).catch(next);
});

router.get('/:formid', function (req, res, next) {
  QQ(Form.findById(req.params.formid).populate('head')).
  then(function (form) {
    if (!form) return Q.reject('not-found');
    return Q.nbind(form.head.populate, form.head)('template').
    then(function (head) {
      form.head = head;
      res.send(form);
    });
  }).catch(next);
});

router.post('/create', largerJsonParser, function (req, res, next) {
  FormRevision.create(
    req.body.title,
    req.body.content,
    req.body.parent,
    req.body.slug,
    req.body.template
  ).then(function (revision) {
    res.send(revision.sanitize());
  }).catch(next);
});

module.exports = router;
