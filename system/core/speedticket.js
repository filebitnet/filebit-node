import CApi from './api.js';

export default class CSpeedTicket {
  constructor() {
    this.Api = new CApi;
  }

  async check(key) {
    const Response = await this.Api.Call('app/keytype.json', {
      key: key
    });
    if ('key' in Response && 'keytype' in Response) {
      return (Response.keytype == 'st');
    }
    return false;
  }

  async requestChiffre(key) {
    const Response = await this.Api.Call('app/licence/add.json', {
      key: key
    });
    if ('error' in Response && Response.error == 'invalid request') {
      return false;
    } else if ('error' in Response) {
      return -1;
    }
    return Response.chiffre;
  }

  async checkKey(key) {
    const Response = await this.Api.Call('app/licence/check.json', {
      key: key
    });

    if ('tickets' in Response && key in Response.tickets) {
      return Response.tickets[key];
    } else {
      return {
        error: 'invalid request'
      }
    }
  }

  async checkChiffre(key, a, b, c) {
      const Response = await this.Api.Call('app/licence/add.json', {
        key: key,
        otvet_a: a,
        otvet_b: b,
        otvet_c: c
      });

      if ('error' in Response) {
        return false;
      }
      if ('key' in Response) {
        return Response.key;
      }
      return false;
    }
    //['/app/keystats.json', 'keystats'],
  async checkTicket(ticket) {
    const Response = await this.Api.Call('app/keystats.json', {
      key: ticket
    });

    if ('error' in Response) {
      return false;
    }

    //[usageToday, Number(st.trafficUsed), st.row.traffic]
    return {
      traffic: {
        today: Response.traffic[0],
        used: Response.traffic[1],
        traffic: Response.traffic[2]
      },
      valid: {
        from: Response.valid[0],
        to: Response.valid[1]
      }
    };
  }
}